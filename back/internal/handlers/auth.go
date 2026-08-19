package handlers

import (
	"crypto/subtle"
	"net/http"
	"time"

	"subvault/internal/config"
	"subvault/internal/crypto"
	"subvault/internal/database"
	"subvault/internal/middleware"
	"subvault/internal/models"
	"subvault/internal/recovery"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/pquerna/otp/totp"
	"gorm.io/gorm"
)

type AuthHandler struct {
	cfg *config.Config
}

func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{cfg: cfg}
}

type UnlockRequest struct {
	MasterKey string `json:"masterKey" binding:"required,min=1"`
	TotpCode  string `json:"totpCode,omitempty"`
}

type AuthResponse struct {
	Token   string `json:"token"`
	VaultID string `json:"vaultId"`
	IsNew   bool   `json:"isNew"`
}

// Unlock 使用环境变量 MASTER_KEY 校验后解锁唯一保险库。
// 密码错误直接拒绝，不会创建新账户。
func (h *AuthHandler) Unlock(c *gin.Context) {
	var req UnlockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供主密钥"})
		return
	}

	if !masterKeyEquals(req.MasterKey, h.cfg.MasterKey) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "主密钥错误"})
		return
	}

	vault, isNew, err := getOrCreateSoleVault(req.MasterKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解锁保险库失败"})
		return
	}

	var totpSetting models.TotpSetting
	if err := database.DB.Where("vault_id = ?", vault.ID).First(&totpSetting).Error; err == nil {
		if totpSetting.Enabled && totpSetting.Verified {
			if req.TotpCode == "" {
				c.JSON(http.StatusForbidden, gin.H{"error": "需要两步验证", "totp_required": true})
				return
			}
			secret, decErr := crypto.DecryptField(totpSetting.Secret, h.cfg.EncryptionKey)
			if decErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "验证失败"})
				return
			}
			if !totp.Validate(req.TotpCode, secret) {
				if !recovery.Consume(database.DB, vault.ID, req.TotpCode) {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "验证码错误"})
					return
				}
			}
		}
	}

	token, err := h.generateToken(vault.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成令牌失败"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{
		Token:   token,
		VaultID: vault.ID,
		IsNew:   isNew,
	})
}

func masterKeyEquals(provided, expected string) bool {
	if subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) == 1 {
		return true
	}
	return false
}

// getOrCreateSoleVault 始终只使用最早创建的那一个保险库。
func getOrCreateSoleVault(masterKey string) (models.Vault, bool, error) {
	var vault models.Vault
	err := database.DB.Order("created_at ASC").First(&vault).Error
	if err == nil {
		return vault, false, nil
	}
	if err != gorm.ErrRecordNotFound {
		return models.Vault{}, false, err
	}

	bcryptHash, hashErr := crypto.HashPassword(masterKey)
	if hashErr != nil {
		return models.Vault{}, false, hashErr
	}

	vault = models.Vault{
		KeyHash:   "sole-vault-v1",
		KeyBcrypt: bcryptHash,
	}
	if err := database.DB.Create(&vault).Error; err != nil {
		return models.Vault{}, false, err
	}
	return vault, true, nil
}

func (h *AuthHandler) VerifyToken(c *gin.Context) {
	vaultID := c.GetString("vaultId")
	c.JSON(http.StatusOK, gin.H{"vaultId": vaultID, "valid": true})
}

func (h *AuthHandler) generateToken(vaultID string) (string, error) {
	claims := middleware.Claims{
		VaultID: vaultID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.cfg.JWTSecret))
}
