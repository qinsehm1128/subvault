package database

import (
	"os"
	"path/filepath"

	"subvault/internal/models"

	"gorm.io/driver/sqlite"
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
	return DB.AutoMigrate(
		&models.Vault{},
		&models.Credential{},
		&models.Subscription{},
		&models.Tag{},
		&models.NotificationSetting{},
		&models.AIConfig{},
		&models.AIChat{},
		&models.AIReport{},
	)
}

func GetDB() *gorm.DB {
	return DB
}
