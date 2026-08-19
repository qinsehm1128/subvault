package recovery

import (
	"testing"

	"subvault/internal/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestGenerateAndConsume(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.TotpRecoveryCode{}); err != nil {
		t.Fatal(err)
	}

	codes, err := Generate(db, "vault-1", 8)
	if err != nil {
		t.Fatal(err)
	}
	if len(codes) != 8 {
		t.Fatalf("应生成 8 个恢复码，实际 %d", len(codes))
	}
	if !Consume(db, "vault-1", codes[0]) {
		t.Fatal("正确恢复码应通过")
	}
	if Consume(db, "vault-1", codes[0]) {
		t.Fatal("恢复码只能使用一次")
	}
	if Consume(db, "vault-1", "NOPE-CODE") {
		t.Fatal("错误恢复码应拒绝")
	}
}
