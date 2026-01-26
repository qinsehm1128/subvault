package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Memo 备忘录
// Content 字段存储 AES-256-GCM 加密后的密文
type Memo struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	VaultID   string    `json:"vaultId" gorm:"index;not null"`
	Title     string    `json:"title" gorm:"not null"`
	Content   string    `json:"content"`                       // 存储 AES-256-GCM 加密后的密文
	Category  string    `json:"category" gorm:"default:其他"`
	IsPinned  bool      `json:"isPinned" gorm:"default:false"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// BeforeCreate GORM hook to generate UUID before creating a new memo
func (m *Memo) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}
