package renewal

import (
	"time"

	"subvault/internal/models"

	"gorm.io/gorm"
)

func Location() *time.Location {
	return time.FixedZone("CST", 8*3600)
}

func Today() time.Time {
	now := time.Now().In(Location())
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, Location())
}

func ParseDate(value string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02", value, Location())
}

func FormatDate(t time.Time) string {
	return t.In(Location()).Format("2006-01-02")
}

func AddFrequency(from time.Time, amount int, unit string) time.Time {
	if amount < 1 {
		amount = 1
	}
	switch unit {
	case "DAYS":
		return from.AddDate(0, 0, amount)
	case "WEEKS":
		return from.AddDate(0, 0, amount*7)
	case "MONTHS":
		return from.AddDate(0, amount, 0)
	case "YEARS":
		return from.AddDate(amount, 0, 0)
	default:
		return from.AddDate(0, amount, 0)
	}
}

func DaysUntil(renewalDate string, today time.Time) (int, bool) {
	if renewalDate == "9999-12-31" {
		return 0, false
	}
	rd, err := ParseDate(renewalDate)
	if err != nil {
		return 0, false
	}
	return int(rd.Sub(today).Hours() / 24), true
}

// RotateIfDue 到期日已过时，按周期推进到未来。返回是否改写了日期。
func RotateIfDue(sub *models.Subscription, today time.Time) bool {
	if sub == nil || !sub.AutoRotate || !sub.Active || sub.FrequencyUnit == "PERMANENT" {
		return false
	}
	if sub.FrequencyAmount < 1 {
		sub.FrequencyAmount = 1
	}

	changed := false
	for i := 0; i < 120; i++ {
		rd, err := ParseDate(sub.RenewalDate)
		if err != nil {
			return changed
		}
		if !rd.Before(today) {
			return changed
		}
		next := AddFrequency(rd, sub.FrequencyAmount, sub.FrequencyUnit)
		if !next.After(rd) {
			return changed
		}
		sub.StartDate = FormatDate(rd)
		sub.RenewalDate = FormatDate(next)
		changed = true
	}
	return changed
}

func RotateAndSave(db *gorm.DB, subscriptions []models.Subscription, today time.Time) []models.Subscription {
	for i := range subscriptions {
		if !RotateIfDue(&subscriptions[i], today) {
			continue
		}
		db.Model(&subscriptions[i]).Updates(map[string]interface{}{
			"start_date":   subscriptions[i].StartDate,
			"renewal_date": subscriptions[i].RenewalDate,
		})
		_ = db.Create(&models.RenewalEvent{
			VaultID:        subscriptions[i].VaultID,
			SubscriptionID: subscriptions[i].ID,
			Amount:         subscriptions[i].Cost,
			Currency:       subscriptions[i].Currency,
			OccurredOn:     subscriptions[i].StartDate,
			Source:         "rotate",
		}).Error
	}
	return subscriptions
}

func RotateAllOverdue(db *gorm.DB) error {
	var subscriptions []models.Subscription
	if err := db.Where("auto_rotate = ? AND active = ?", true, true).Find(&subscriptions).Error; err != nil {
		return err
	}
	RotateAndSave(db, subscriptions, Today())
	return nil
}
