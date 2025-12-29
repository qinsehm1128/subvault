package handlers

import (
	"net/http"
	"time"

	"subvault/internal/config"
	"subvault/internal/crypto"
	"subvault/internal/database"
	"subvault/internal/models"

	"github.com/gin-gonic/gin"
)

type VaultHandler struct {
	cfg *config.Config
}

func NewVaultHandler(cfg *config.Config) *VaultHandler {
	return &VaultHandler{cfg: cfg}
}

// GetVault 获取完整 Vault 数据
func (h *VaultHandler) GetVault(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var credentials []models.Credential
	var subscriptions []models.Subscription

	database.DB.Where("vault_id = ?", vaultID).Find(&credentials)
	database.DB.Where("vault_id = ?", vaultID).Find(&subscriptions)

	// 解密凭证敏感字段
	for i := range credentials {
		if credentials[i].Password != "" {
			decrypted, err := crypto.Decrypt(credentials[i].Password, h.cfg.EncryptionKey)
			if err == nil {
				credentials[i].Password = decrypted
			}
		}
		if credentials[i].Notes != "" {
			decrypted, err := crypto.Decrypt(credentials[i].Notes, h.cfg.EncryptionKey)
			if err == nil {
				credentials[i].Notes = decrypted
			}
		}
	}

	if credentials == nil {
		credentials = []models.Credential{}
	}
	if subscriptions == nil {
		subscriptions = []models.Subscription{}
	}

	c.JSON(http.StatusOK, models.VaultData{
		Credentials:   credentials,
		Subscriptions: subscriptions,
		LastUpdated:   time.Now().UnixMilli(),
	})
}

// === 订阅相关 ===

func (h *VaultHandler) GetSubscriptions(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var subscriptions []models.Subscription
	database.DB.Where("vault_id = ?", vaultID).Find(&subscriptions)

	if subscriptions == nil {
		subscriptions = []models.Subscription{}
	}

	c.JSON(http.StatusOK, subscriptions)
}

func (h *VaultHandler) CreateSubscription(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var sub models.Subscription
	if err := c.ShouldBindJSON(&sub); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的订阅数据"})
		return
	}

	sub.VaultID = vaultID

	if err := database.DB.Create(&sub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建订阅失败"})
		return
	}

	c.JSON(http.StatusCreated, sub)
}

func (h *VaultHandler) UpdateSubscription(c *gin.Context) {
	vaultID := c.GetString("vaultId")
	subID := c.Param("id")

	var sub models.Subscription
	if err := database.DB.Where("id = ? AND vault_id = ?", subID, vaultID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "订阅不存在"})
		return
	}

	var updateData models.Subscription
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的更新数据"})
		return
	}

	database.DB.Model(&sub).Updates(map[string]interface{}{
		"name":             updateData.Name,
		"cost":             updateData.Cost,
		"currency":         updateData.Currency,
		"frequency_amount": updateData.FrequencyAmount,
		"frequency_unit":   updateData.FrequencyUnit,
		"renewal_date":     updateData.RenewalDate,
		"start_date":       updateData.StartDate,
		"category":         updateData.Category,
		"credential_id":    updateData.CredentialID,
		"website":          updateData.Website,
		"active":           updateData.Active,
	})

	c.JSON(http.StatusOK, sub)
}

func (h *VaultHandler) DeleteSubscription(c *gin.Context) {
	vaultID := c.GetString("vaultId")
	subID := c.Param("id")

	result := database.DB.Where("id = ? AND vault_id = ?", subID, vaultID).Delete(&models.Subscription{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "订阅不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// === 凭证相关 ===

func (h *VaultHandler) GetCredentials(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var credentials []models.Credential
	database.DB.Where("vault_id = ?", vaultID).Find(&credentials)

	// 解密敏感字段
	for i := range credentials {
		if credentials[i].Password != "" {
			decrypted, err := crypto.Decrypt(credentials[i].Password, h.cfg.EncryptionKey)
			if err == nil {
				credentials[i].Password = decrypted
			}
		}
		if credentials[i].Notes != "" {
			decrypted, err := crypto.Decrypt(credentials[i].Notes, h.cfg.EncryptionKey)
			if err == nil {
				credentials[i].Notes = decrypted
			}
		}
	}

	if credentials == nil {
		credentials = []models.Credential{}
	}

	c.JSON(http.StatusOK, credentials)
}

func (h *VaultHandler) CreateCredential(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var cred models.Credential
	if err := c.ShouldBindJSON(&cred); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的凭证数据"})
		return
	}

	cred.VaultID = vaultID

	// 加密敏感字段
	if cred.Password != "" {
		encrypted, err := crypto.Encrypt(cred.Password, h.cfg.EncryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "加密失败"})
			return
		}
		cred.Password = encrypted
	}
	if cred.Notes != "" {
		encrypted, err := crypto.Encrypt(cred.Notes, h.cfg.EncryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "加密失败"})
			return
		}
		cred.Notes = encrypted
	}

	if err := database.DB.Create(&cred).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建凭证失败"})
		return
	}

	// 返回时解密
	if cred.Password != "" {
		decrypted, _ := crypto.Decrypt(cred.Password, h.cfg.EncryptionKey)
		cred.Password = decrypted
	}
	if cred.Notes != "" {
		decrypted, _ := crypto.Decrypt(cred.Notes, h.cfg.EncryptionKey)
		cred.Notes = decrypted
	}

	c.JSON(http.StatusCreated, cred)
}

func (h *VaultHandler) UpdateCredential(c *gin.Context) {
	vaultID := c.GetString("vaultId")
	credID := c.Param("id")

	var cred models.Credential
	if err := database.DB.Where("id = ? AND vault_id = ?", credID, vaultID).First(&cred).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "凭证不存在"})
		return
	}

	var updateData models.Credential
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的更新数据"})
		return
	}

	// 加密敏感字段
	encryptedPassword := ""
	encryptedNotes := ""
	if updateData.Password != "" {
		encrypted, err := crypto.Encrypt(updateData.Password, h.cfg.EncryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "加密失败"})
			return
		}
		encryptedPassword = encrypted
	}
	if updateData.Notes != "" {
		encrypted, err := crypto.Encrypt(updateData.Notes, h.cfg.EncryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "加密失败"})
			return
		}
		encryptedNotes = encrypted
	}

	database.DB.Model(&cred).Updates(map[string]interface{}{
		"username": updateData.Username,
		"password": encryptedPassword,
		"label":    updateData.Label,
		"notes":    encryptedNotes,
	})

	// 返回解密后的数据
	cred.Username = updateData.Username
	cred.Password = updateData.Password
	cred.Label = updateData.Label
	cred.Notes = updateData.Notes

	c.JSON(http.StatusOK, cred)
}

func (h *VaultHandler) DeleteCredential(c *gin.Context) {
	vaultID := c.GetString("vaultId")
	credID := c.Param("id")

	// 先解除订阅关联
	database.DB.Model(&models.Subscription{}).
		Where("vault_id = ? AND credential_id = ?", vaultID, credID).
		Update("credential_id", nil)

	result := database.DB.Where("id = ? AND vault_id = ?", credID, vaultID).Delete(&models.Credential{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "凭证不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
