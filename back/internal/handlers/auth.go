package handlers

import (
	"net/http"
	"time"

	"subvault/internal/config"
	"subvault/internal/crypto"
	"subvault/internal/database"
	"subvault/internal/middleware"
	"subvault/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/pquerna/otp/totp"
)

// 固定盐值用于派生 Vault 查找键（不是密码存储，只是用于查找）
const vaultSalt = "subvault-vault-lookup-salt-v1"

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

// Unlock 使用主密钥解锁/创建 Vault
// 如果密钥对应的 Vault 不存在，则自动创建
func (h *AuthHandler) Unlock(c *gin.Context) {
	var req UnlockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供主密钥"})
		return
	}

	// 使用派生密钥查找 Vault（可重复计算）
	lookupKey := crypto.DeriveKeyFromPassword(req.MasterKey, vaultSalt)

	var vault models.Vault
	isNew := false

	if err := database.DB.Where("key_hash = ?", lookupKey).First(&vault).Error; err != nil {
		// Vault 不存在，创建新的
		// 同时存储 bcrypt 哈希用于验证（可选的额外安全层）
		bcryptHash, hashErr := crypto.HashPassword(req.MasterKey)
		if hashErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建保险库失败"})
			return
		}

		vault = models.Vault{
			KeyHash:    lookupKey,
			KeyBcrypt:  bcryptHash,
		}
		if err := database.DB.Create(&vault).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建保险库失败"})
			return
		}
		isNew = true
	} else {
		// 如果存在 bcrypt 哈希，验证密码
		if vault.KeyBcrypt != "" && !crypto.CheckPasswordHash(req.MasterKey, vault.KeyBcrypt) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "主密钥错误"})
			return
		}
	}

	// 检查是否启用了两步验证
	var totpSetting models.TotpSetting
	if err := database.DB.Where("vault_id = ?", vault.ID).First(&totpSetting).Error; err == nil {
		// 仅当 enabled=true 且 verified=true 时才强制验证
		if totpSetting.Enabled && totpSetting.Verified {
			if req.TotpCode == "" {
				c.JSON(http.StatusForbidden, gin.H{"error": "需要两步验证", "totp_required": true})
				return
			}
			// 解密 TOTP 密钥
			secret, decErr := crypto.DecryptField(totpSetting.Secret, h.cfg.EncryptionKey)
			if decErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "验证失败"})
				return
			}
			if !totp.Validate(req.TotpCode, secret) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "验证码错误"})
				return
			}
		}
	}

	// 生成 JWT
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

// VerifyToken 验证当前 token 是否有效
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
