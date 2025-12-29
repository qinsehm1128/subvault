package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Vault 保险库（通过主密钥哈希标识）
type Vault struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	KeyHash   string    `json:"-" gorm:"uniqueIndex;not null"` // 主密钥的 SHA256 哈希
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (v *Vault) BeforeCreate(tx *gorm.DB) error {
	v.ID = uuid.New().String()
	return nil
}

// Credential 凭证
type Credential struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	VaultID   string    `json:"vaultId" gorm:"index;not null"`
	Username  string    `json:"username" gorm:"not null"`
	Password  string    `json:"password,omitempty"`
	Label     string    `json:"label" gorm:"not null"`
	Notes     string    `json:"notes,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (c *Credential) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

// Subscription 订阅
type Subscription struct {
	ID              string    `json:"id" gorm:"primaryKey"`
	VaultID         string    `json:"vaultId" gorm:"index;not null"`
	Name            string    `json:"name" gorm:"not null"`
	Cost            float64   `json:"cost" gorm:"not null"`
	Currency        string    `json:"currency" gorm:"default:CNY"`
	FrequencyAmount int       `json:"frequencyAmount" gorm:"default:1"`
	FrequencyUnit   string    `json:"frequencyUnit" gorm:"default:MONTHS"`
	RenewalDate     string    `json:"renewalDate"`
	StartDate       string    `json:"startDate"`
	Category        string    `json:"category" gorm:"default:生活"`
	TagIDs          string    `json:"tagIds,omitempty"` // 逗号分隔的标签ID
	CredentialID    *string   `json:"credentialId,omitempty"`
	Website         string    `json:"website,omitempty"`
	Active          bool      `json:"active" gorm:"default:true"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

func (s *Subscription) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// Tag 自定义标签
type Tag struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	VaultID   string    `json:"vaultId" gorm:"index;not null"`
	Name      string    `json:"name" gorm:"not null"`
	Color     string    `json:"color" gorm:"default:#3B82F6"` // 标签颜色
	CreatedAt time.Time `json:"createdAt"`
}

func (t *Tag) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return nil
}

// NotificationSetting 通知设置
type NotificationSetting struct {
	ID             string    `json:"id" gorm:"primaryKey"`
	VaultID        string    `json:"vaultId" gorm:"uniqueIndex;not null"`
	Enabled        bool      `json:"enabled" gorm:"default:true"`
	DaysBeforeList string    `json:"daysBeforeList" gorm:"default:1,3,7"` // 提前几天提醒，逗号分隔
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

func (n *NotificationSetting) BeforeCreate(tx *gorm.DB) error {
	if n.ID == "" {
		n.ID = uuid.New().String()
	}
	return nil
}

// VaultData 用于 API 响应
type VaultData struct {
	Credentials   []Credential   `json:"credentials"`
	Subscriptions []Subscription `json:"subscriptions"`
	LastUpdated   int64          `json:"lastUpdated"`
}

// AIConfig AI 配置（每个 Vault 独立配置）
type AIConfig struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	VaultID   string    `json:"vaultId" gorm:"uniqueIndex;not null"`
	BaseURL   string    `json:"baseUrl"`   // OpenAI 兼容 API 地址
	APIKey    string    `json:"apiKey"`    // API Key
	Model     string    `json:"model"`     // 模型名称
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (a *AIConfig) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}

// AIChat 对话记录
type AIChat struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	VaultID   string    `json:"vaultId" gorm:"index;not null"`
	Role      string    `json:"role" gorm:"not null"` // user, assistant
	Content   string    `json:"content" gorm:"type:text"`
	CreatedAt time.Time `json:"createdAt"`
}

func (c *AIChat) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

// AIReport 审计报告
type AIReport struct {
	ID           string    `json:"id" gorm:"primaryKey"`
	VaultID      string    `json:"vaultId" gorm:"index;not null"`
	TotalMonthly float64   `json:"totalMonthly"`
	TotalYearly  float64   `json:"totalYearly"`
	Categories   string    `json:"categories" gorm:"type:text"` // JSON string
	Insights     string    `json:"insights" gorm:"type:text"`   // JSON string
	CreatedAt    time.Time `json:"createdAt"`
}

func (r *AIReport) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}

// AnalysisResult AI 分析结果（用于 API 响应）
type AnalysisResult struct {
	TotalMonthly float64            `json:"totalMonthly"`
	TotalYearly  float64            `json:"totalYearly"`
	Categories   []CategoryAnalysis `json:"categories"`
	Insights     []string           `json:"insights"`
}

type CategoryAnalysis struct {
	Name       string  `json:"name"`
	Amount     float64 `json:"amount"`
	Percentage float64 `json:"percentage"`
}
