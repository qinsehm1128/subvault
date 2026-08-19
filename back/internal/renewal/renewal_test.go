package renewal

import (
	"testing"
	"time"

	"subvault/internal/models"
)

func TestRotateIfDueAdvancesPastCycles(t *testing.T) {
	today := time.Date(2026, 8, 19, 0, 0, 0, 0, Location())
	sub := models.Subscription{
		AutoRotate:      true,
		Active:          true,
		FrequencyAmount: 1,
		FrequencyUnit:   "MONTHS",
		StartDate:       "2026-05-10",
		RenewalDate:     "2026-06-10",
	}

	if !RotateIfDue(&sub, today) {
		t.Fatal("过期订阅应自动轮转")
	}
	if sub.RenewalDate != "2026-09-10" {
		t.Fatalf("轮转后到期日应为 2026-09-10，实际 %s", sub.RenewalDate)
	}
	if sub.StartDate != "2026-08-10" {
		t.Fatalf("轮转后起算日应为 2026-08-10，实际 %s", sub.StartDate)
	}
}

func TestRotateIfDueSkipsWhenDisabled(t *testing.T) {
	today := time.Date(2026, 8, 19, 0, 0, 0, 0, Location())
	sub := models.Subscription{
		AutoRotate:  false,
		Active:      true,
		FrequencyUnit: "MONTHS",
		RenewalDate: "2026-06-10",
	}
	if RotateIfDue(&sub, today) {
		t.Fatal("未开启自动轮转时不应改写日期")
	}
}
