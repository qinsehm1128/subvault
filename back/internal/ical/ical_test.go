package ical

import (
	"strings"
	"testing"

	"subvault/internal/models"
)

func TestBuildIncludesRenewalAndTrial(t *testing.T) {
	out := Build([]models.Subscription{
		{
			ID: "abc", Name: "Netflix", Cost: 18, Currency: "USD",
			FrequencyUnit: "MONTHS", RenewalDate: "2026-09-01", Status: "active", Active: true,
			TrialEndsOn: "2026-08-25",
		},
		{ID: "paused", Name: "Paused", FrequencyUnit: "MONTHS", RenewalDate: "2026-09-01", Status: "paused"},
	})
	if !strings.Contains(out, "BEGIN:VCALENDAR") || !strings.Contains(out, "Netflix 续费") {
		t.Fatalf("日历应包含续费事件: %s", out)
	}
	if !strings.Contains(out, "DTSTART;VALUE=DATE:20260901") {
		t.Fatalf("续费日期不正确: %s", out)
	}
	if !strings.Contains(out, "试用结束") {
		t.Fatalf("应包含试用结束事件: %s", out)
	}
	if strings.Contains(out, "Paused") {
		t.Fatalf("暂停订阅不应进入日历: %s", out)
	}
}
