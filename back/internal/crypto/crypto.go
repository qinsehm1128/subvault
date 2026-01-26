package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"io"

	"golang.org/x/crypto/bcrypt"
	"golang.org/x/crypto/pbkdf2"
)

// HashPassword 使用 bcrypt 哈希密码（用于主密钥）
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPasswordHash 验证密码哈希
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// DeriveKeyFromPassword 从密码派生固定长度的密钥（用于查找 Vault）
// 使用 PBKDF2 + 固定盐值生成可重复的哈希
func DeriveKeyFromPassword(password string, salt string) string {
	key := pbkdf2.Key([]byte(password), []byte(salt), 100000, 32, sha256.New)
	return hex.EncodeToString(key)
}

// Encrypt 使用 AES-256-GCM 加密数据
func Encrypt(plaintext string, key string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	// 确保密钥是 32 字节
	keyBytes := deriveAESKey(key)

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt 使用 AES-256-GCM 解密数据
func Decrypt(ciphertext string, key string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	keyBytes := deriveAESKey(key)

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, cipherData := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, cipherData, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// deriveAESKey 从任意长度的密钥派生 32 字节的 AES 密钥
// 使用 PBKDF2 增强安全性
func deriveAESKey(key string) []byte {
	const aesKeySalt = "subvault-aes-key-salt-v1"
	return pbkdf2.Key([]byte(key), []byte(aesKeySalt), 100000, 32, sha256.New)
}

// EncryptField 加密单个字段，空字符串返回空字符串
func EncryptField(plaintext, key string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	return Encrypt(plaintext, key)
}

// DecryptField 解密单个字段，空字符串返回空字符串
func DecryptField(ciphertext, key string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}
	return Decrypt(ciphertext, key)
}
