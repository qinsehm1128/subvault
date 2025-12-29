package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"

	"subvault/internal/config"
	"subvault/internal/database"
	"subvault/internal/middleware"
	"subvault/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type AuthHandler struct {
	cfg *config.Config
}

func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{cfg: cfg}
}

type UnlockRequest struct {
	MasterKey string `json:"masterKey" binding:"required,min=1"`
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

	// 使用 SHA256 哈希主密钥作为 Vault 标识
	keyHash := hashMasterKey(req.MasterKey)

	var vault models.Vault
	isNew := false

	if err := database.DB.Where("key_hash = ?", keyHash).First(&vault).Error; err != nil {
		// Vault 不存在，创建新的
		vault = models.Vault{
			KeyHash: keyHash,
		}
		if err := database.DB.Create(&vault).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建保险库失败"})
			return
		}
		isNew = true
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
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)), // 24小时过期
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.cfg.JWTSecret))
}

// 使用 SHA256 哈希主密钥
func hashMasterKey(key string) string {
	hash := sha256.Sum256([]byte(key))
	return hex.EncodeToString(hash[:])
}
