package handlers

import (
	"net/http"

	"subvault/internal/config"
	"subvault/internal/crypto"
	"subvault/internal/database"
	"subvault/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/pquerna/otp/totp"
)

type TotpHandler struct {
	cfg *config.Config
}

func NewTotpHandler(cfg *config.Config) *TotpHandler {
	return &TotpHandler{cfg: cfg}
}

type SetupTOTPResponse struct {
	URI    string `json:"uri"`
	Secret string `json:"secret"`
}

type VerifyTOTPRequest struct {
	Code string `json:"code" binding:"required"`
}

// SetupTOTP 生成 TOTP 密钥并保存
func (h *TotpHandler) SetupTOTP(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	// 检查是否已存在
	var existing models.TotpSetting
	if err := database.DB.Where("vault_id = ?", vaultID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "两步验证已设置，请先禁用再重新设置"})
		return
	}

	// 生成 TOTP 密钥
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "SubVault",
		AccountName: vaultID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成验证密钥失败"})
		return
	}

	// 加密密钥后存储
	encryptedSecret, err := crypto.EncryptField(key.Secret(), h.cfg.EncryptionKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "加密密钥失败"})
		return
	}

	setting := models.TotpSetting{
		VaultID:  vaultID,
		Secret:   encryptedSecret,
		Enabled:  true,
		Verified: false,
	}

	if err := database.DB.Create(&setting).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存验证设置失败"})
		return
	}

	c.JSON(http.StatusOK, SetupTOTPResponse{
		URI:    key.URL(),
		Secret: key.Secret(),
	})
}

// VerifyTOTP 验证 TOTP 验证码并标记为已验证
func (h *TotpHandler) VerifyTOTP(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var req VerifyTOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供验证码"})
		return
	}

	var setting models.TotpSetting
	if err := database.DB.Where("vault_id = ?", vaultID).First(&setting).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到两步验证设置"})
		return
	}

	// 解密密钥
	secret, err := crypto.DecryptField(setting.Secret, h.cfg.EncryptionKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解密密钥失败"})
		return
	}

	// 验证码校验
	if !totp.Validate(req.Code, secret) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "验证码错误"})
		return
	}

	// 标记为已验证
	database.DB.Model(&setting).Update("verified", true)

	c.JSON(http.StatusOK, gin.H{"message": "两步验证已启用"})
}

// DisableTOTP 禁用两步验证
func (h *TotpHandler) DisableTOTP(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	result := database.DB.Where("vault_id = ?", vaultID).Delete(&models.TotpSetting{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到两步验证设置"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "两步验证已禁用"})
}

// GetTOTPStatus 获取两步验证状态
func (h *TotpHandler) GetTOTPStatus(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var setting models.TotpSetting
	if err := database.DB.Where("vault_id = ?", vaultID).First(&setting).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"enabled": false, "verified": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{"enabled": setting.Enabled, "verified": setting.Verified})
}
