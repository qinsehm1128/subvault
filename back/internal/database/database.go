package database

import (
	"os"
	"path/filepath"

	"subvault/internal/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Init(dbPath string) error {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return err
	}

	// 自动迁移
	if err := DB.AutoMigrate(
		&models.Vault{},
		&models.Credential{},
		&models.Subscription{},
		&models.Tag{},
		&models.NotificationSetting{},
		&models.WebhookDelivery{},
		&models.AIConfig{},
		&models.AIChat{},
		&models.AIReport{},
		&models.Memo{},
		&models.TotpSetting{},
		&models.PriceHistory{},
		&models.RenewalEvent{},
		&models.TotpRecoveryCode{},
	); err != nil {
		return err
	}

	// 旧库 unique 不含 kind，重建以免试用/优惠提醒与续费提醒互相挡住
	_ = DB.Exec("DROP INDEX IF EXISTS idx_webhook_delivery").Error
	_ = DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_delivery ON webhook_deliveries (vault_id, subscription_id, days_left, sent_date, kind)").Error
	return nil
}

func GetDB() *gorm.DB {
	return DB
}
