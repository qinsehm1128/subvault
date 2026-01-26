package handlers

import (
	"net/http"
	"strings"

	"subvault/internal/config"
	"subvault/internal/crypto"
	"subvault/internal/database"
	"subvault/internal/models"

	"github.com/gin-gonic/gin"
)

type MemoHandler struct {
	cfg *config.Config
}

func NewMemoHandler(cfg *config.Config) *MemoHandler {
	return &MemoHandler{cfg: cfg}
}

// GetMemos 获取用户所有备忘录，解密内容
// GET /api/v1/memos
// Requirements: 1.2, 7.1
func (h *MemoHandler) GetMemos(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var memos []models.Memo
	if err := database.DB.Where("vault_id = ?", vaultID).Find(&memos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "操作失败"})
		return
	}

	// 解密每个备忘录的内容
	for i := range memos {
		if memos[i].Content != "" {
			decrypted, err := crypto.DecryptField(memos[i].Content, h.cfg.EncryptionKey)
			if err != nil {
				// 解密失败时返回空内容，不中断整个请求
				memos[i].Content = ""
			} else {
				memos[i].Content = decrypted
			}
		}
	}

	// 确保返回空数组而不是 null
	if memos == nil {
		memos = []models.Memo{}
	}

	c.JSON(http.StatusOK, memos)
}

// CreateMemo 创建新备忘录
// POST /api/v1/memos
// Requirements: 1.2, 1.3, 1.4, 7.1
func (h *MemoHandler) CreateMemo(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var memo models.Memo
	if err := c.ShouldBindJSON(&memo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的备忘录数据"})
		return
	}

	// 验证标题不能为空
	if strings.TrimSpace(memo.Title) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "标题不能为空"})
		return
	}

	// 设置 VaultID
	memo.VaultID = vaultID

	// 加密内容
	if memo.Content != "" {
		encrypted, err := crypto.EncryptField(memo.Content, h.cfg.EncryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "加密失败"})
			return
		}
		memo.Content = encrypted
	}

	// 保存到数据库
	if err := database.DB.Create(&memo).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "操作失败"})
		return
	}

	// 返回时解密内容
	if memo.Content != "" {
		decrypted, _ := crypto.DecryptField(memo.Content, h.cfg.EncryptionKey)
		memo.Content = decrypted
	}

	c.JSON(http.StatusCreated, memo)
}

// UpdateMemo 更新备忘录
// PUT /api/v1/memos/:id
// Requirements: 2.3, 7.1
func (h *MemoHandler) UpdateMemo(c *gin.Context) {
	vaultID := c.GetString("vaultId")
	memoID := c.Param("id")

	// 验证备忘录存在且属于当前用户
	var memo models.Memo
	if err := database.DB.Where("id = ? AND vault_id = ?", memoID, vaultID).First(&memo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "备忘录不存在"})
		return
	}

	var updateData models.Memo
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的备忘录数据"})
		return
	}

	// 验证标题不能为空
	if strings.TrimSpace(updateData.Title) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "标题不能为空"})
		return
	}

	// 准备更新数据
	updates := map[string]interface{}{
		"title":     updateData.Title,
		"category":  updateData.Category,
		"is_pinned": updateData.IsPinned,
	}

	// 加密内容
	if updateData.Content != "" {
		encrypted, err := crypto.EncryptField(updateData.Content, h.cfg.EncryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "加密失败"})
			return
		}
		updates["content"] = encrypted
	} else {
		updates["content"] = ""
	}

	// 更新数据库
	if err := database.DB.Model(&memo).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "操作失败"})
		return
	}

	// 返回更新后的数据（解密内容）
	memo.Title = updateData.Title
	memo.Content = updateData.Content
	memo.Category = updateData.Category
	memo.IsPinned = updateData.IsPinned

	c.JSON(http.StatusOK, memo)
}

// DeleteMemo 删除备忘录
// DELETE /api/v1/memos/:id
// Requirements: 3.2
func (h *MemoHandler) DeleteMemo(c *gin.Context) {
	vaultID := c.GetString("vaultId")
	memoID := c.Param("id")

	// 删除备忘录（同时验证权限）
	result := database.DB.Where("id = ? AND vault_id = ?", memoID, vaultID).Delete(&models.Memo{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "备忘录不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
