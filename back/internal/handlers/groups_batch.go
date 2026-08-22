package handlers

import (
	"net/http"
	"strings"

	"subvault/internal/crypto"
	"subvault/internal/database"
	"subvault/internal/models"

	"github.com/gin-gonic/gin"
)

type GroupAssignment struct {
	ID       string `json:"id"`
	Category string `json:"category"`
}

type updateGroupsRequest struct {
	Assignments []GroupAssignment `json:"assignments"`
}

type batchCredentialItem struct {
	Label    string `json:"label"`
	Username string `json:"username"`
	Password string `json:"password"`
	Notes    string `json:"notes"`
	Website  string `json:"website"`
	Category string `json:"category"`
}

type batchCreateCredentialsRequest struct {
	Items []batchCredentialItem `json:"items"`
}

type batchResultItem struct {
	Label  string `json:"label"`
	Reason string `json:"reason"`
}

func (h *VaultHandler) BatchCreateCredentials(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var input batchCreateCredentialsRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的凭证数据"})
		return
	}
	if len(input.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "没有可导入的凭证"})
		return
	}
	if len(input.Items) > 200 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "单次最多导入 200 条"})
		return
	}

	var existing []models.Credential
	database.DB.Select("label", "username", "website").Where("vault_id = ?", vaultID).Find(&existing)
	seen := make(map[string]struct{}, len(existing)+len(input.Items))
	for _, cred := range existing {
		seen[credentialDupKey(cred.Label, cred.Username, cred.Website)] = struct{}{}
	}

	names := make([]string, 0, len(input.Items))
	for _, item := range input.Items {
		names = append(names, item.Category)
	}
	ensureTagsForNames(vaultID, names)

	created := make([]models.Credential, 0)
	skipped := make([]batchResultItem, 0)
	failed := make([]batchResultItem, 0)

	for _, item := range input.Items {
		label := strings.TrimSpace(item.Label)
		if label == "" {
			failed = append(failed, batchResultItem{Label: item.Label, Reason: "缺少名称"})
			continue
		}

		username := strings.TrimSpace(item.Username)
		password := item.Password
		notes := item.Notes
		website := strings.TrimSpace(item.Website)
		if username == "" && strings.TrimSpace(password) == "" && strings.TrimSpace(notes) == "" && website == "" {
			failed = append(failed, batchResultItem{Label: label, Reason: "缺少账号、密码或备注"})
			continue
		}

		key := credentialDupKey(label, username, website)
		if _, ok := seen[key]; ok {
			skipped = append(skipped, batchResultItem{Label: label, Reason: "已存在，已跳过"})
			continue
		}

		cred := models.Credential{
			VaultID:  vaultID,
			Label:    label,
			Username: username,
			Password: password,
			Notes:    notes,
			Website:  website,
			Category: ResolveGroupName(item.Category),
		}

		if cred.Password != "" {
			encrypted, err := crypto.EncryptField(cred.Password, h.cfg.EncryptionKey)
			if err != nil {
				failed = append(failed, batchResultItem{Label: label, Reason: "加密失败"})
				continue
			}
			cred.Password = encrypted
		}
		if cred.Notes != "" {
			encrypted, err := crypto.EncryptField(cred.Notes, h.cfg.EncryptionKey)
			if err != nil {
				failed = append(failed, batchResultItem{Label: label, Reason: "加密失败"})
				continue
			}
			cred.Notes = encrypted
		}

		if err := database.DB.Create(&cred).Error; err != nil {
			failed = append(failed, batchResultItem{Label: label, Reason: "写入失败"})
			continue
		}

		if cred.Password != "" {
			cred.Password, _ = crypto.DecryptField(cred.Password, h.cfg.EncryptionKey)
		}
		if cred.Notes != "" {
			cred.Notes, _ = crypto.DecryptField(cred.Notes, h.cfg.EncryptionKey)
		}

		seen[key] = struct{}{}
		created = append(created, cred)
	}

	c.JSON(http.StatusOK, gin.H{
		"created":      created,
		"skipped":      skipped,
		"failed":       failed,
		"createdCount": len(created),
		"skippedCount": len(skipped),
		"failedCount":  len(failed),
	})
}

func (h *VaultHandler) UpdateCredentialGroups(c *gin.Context) {
	updateRecordGroups(c, &models.Credential{})
}

func (h *VaultHandler) UpdateSubscriptionGroups(c *gin.Context) {
	updateRecordGroups(c, &models.Subscription{})
}

func (h *MemoHandler) UpdateMemoGroups(c *gin.Context) {
	updateRecordGroups(c, &models.Memo{})
}

func updateRecordGroups(c *gin.Context, model interface{}) {
	vaultID := c.GetString("vaultId")

	var input updateGroupsRequest
	if err := c.ShouldBindJSON(&input); err != nil || len(input.Assignments) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的分组数据"})
		return
	}
	if len(input.Assignments) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "单次最多调整 500 条"})
		return
	}

	names := make([]string, 0, len(input.Assignments))
	for _, item := range input.Assignments {
		names = append(names, item.Category)
	}
	canonical, _ := ensureTagsForNames(vaultID, names)

	updated := 0
	for _, item := range input.Assignments {
		id := strings.TrimSpace(item.ID)
		if id == "" {
			continue
		}
		name := ResolveGroupName(item.Category)
		if next, ok := canonical[item.Category]; ok {
			name = next
		}
		result := database.DB.Model(model).Where("id = ? AND vault_id = ?", id, vaultID).Update("category", name)
		if result.Error == nil {
			updated += int(result.RowsAffected)
		}
	}

	c.JSON(http.StatusOK, gin.H{"updated": updated})
}
