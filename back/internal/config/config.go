package config

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"os"
)

type Config struct {
	JWTSecret     string
	EncryptionKey string // 用于加密敏感数据的密钥
	DatabasePath  string
	Environment   string
}

func Load() *Config {
	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		if env == "production" {
			log.Fatal("生产环境必须设置 JWT_SECRET 环境变量")
		}
		jwtSecret = generateRandomKey(32)
		log.Printf("警告: 未设置 JWT_SECRET，已生成临时密钥（仅用于开发环境）")
	}

	encryptionKey := os.Getenv("ENCRYPTION_KEY")
	if encryptionKey == "" {
		if env == "production" {
			log.Fatal("生产环境必须设置 ENCRYPTION_KEY 环境变量")
		}
		encryptionKey = generateRandomKey(32)
		log.Printf("警告: 未设置 ENCRYPTION_KEY，已生成临时密钥（仅用于开发环境）")
	}

	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "./data/subvault.db"
	}

	return &Config{
		JWTSecret:     jwtSecret,
		EncryptionKey: encryptionKey,
		DatabasePath:  dbPath,
		Environment:   env,
	}
}

// generateRandomKey 生成随机密钥
func generateRandomKey(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		log.Fatal("生成随机密钥失败")
	}
	return hex.EncodeToString(bytes)
}
