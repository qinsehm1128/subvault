package recovery

import (
	"crypto/rand"
	"fmt"
	"strings"
	"time"

	"subvault/internal/crypto"
	"subvault/internal/models"

	"gorm.io/gorm"
)

func Generate(db *gorm.DB, vaultID string, n int) ([]string, error) {
	if n < 1 {
		n = 8
	}
	if err := db.Where("vault_id = ?", vaultID).Delete(&models.TotpRecoveryCode{}).Error; err != nil {
		return nil, err
	}
	plain := make([]string, 0, n)
	for i := 0; i < n; i++ {
		code, err := randomCode()
		if err != nil {
			return nil, err
		}
		hash, err := crypto.HashPassword(code)
		if err != nil {
			return nil, err
		}
		row := models.TotpRecoveryCode{VaultID: vaultID, CodeHash: hash}
		if err := db.Create(&row).Error; err != nil {
			return nil, err
		}
		plain = append(plain, code)
	}
	return plain, nil
}

func Consume(db *gorm.DB, vaultID, code string) bool {
	code = strings.ToUpper(strings.TrimSpace(code))
	if code == "" {
		return false
	}
	var rows []models.TotpRecoveryCode
	if err := db.Where("vault_id = ? AND used_at IS NULL", vaultID).Find(&rows).Error; err != nil {
		return false
	}
	for i := range rows {
		if crypto.CheckPasswordHash(code, rows[i].CodeHash) {
			now := time.Now()
			db.Model(&rows[i]).Update("used_at", now)
			return true
		}
	}
	return false
}

func randomCode() (string, error) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	out := make([]byte, 8)
	for i := range buf {
		out[i] = alphabet[int(buf[i])%len(alphabet)]
	}
	return fmt.Sprintf("%s-%s", string(out[:4]), string(out[4:])), nil
}
