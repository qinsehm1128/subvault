package jobs

import (
	"log"
	"strconv"
	"strings"
	"time"

	"subvault/internal/database"
	"subvault/internal/models"
	"subvault/internal/renewal"
	"subvault/internal/webhook"
)

func Start() {
	go func() {
		runOnce()
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			runOnce()
		}
	}()
}

func runOnce() {
	if err := renewal.RotateAllOverdue(database.DB); err != nil {
		log.Printf("自动轮转订阅失败: %v", err)
	}
	if err := SendDueReminders(); err != nil {
		log.Printf("发送续费提醒失败: %v", err)
	}
}

func parseDays(list string, fallback []int) map[int]struct{} {
	out := map[int]struct{}{}
	for _, part := range strings.Split(list, ",") {
		n, err := strconv.Atoi(strings.TrimSpace(part))
		if err != nil || n < 0 {
			continue
		}
		out[n] = struct{}{}
	}
	if len(out) == 0 {
		for _, n := range fallback {
			out[n] = struct{}{}
		}
	}
	return out
}

func SendDueReminders() error {
	var settings []models.NotificationSetting
	if err := database.DB.Where("webhook_enabled = ? AND webhook_url <> ?", true, "").Find(&settings).Error; err != nil {
		return err
	}

	today := renewal.Today()
	todayStr := renewal.FormatDate(today)

	for _, setting := range settings {
		days := parseDays(setting.WebhookDaysBefore, []int{1, 2, 3})
		var subscriptions []models.Subscription
		if err := database.DB.Where("vault_id = ? AND active = ?", setting.VaultID, true).Find(&subscriptions).Error; err != nil {
			return err
		}

		for _, sub := range subscriptions {
			if sub.FrequencyUnit == "PERMANENT" {
				continue
			}
			daysLeft, ok := renewal.DaysUntil(sub.RenewalDate, today)
			if !ok {
				continue
			}
			if _, wanted := days[daysLeft]; !wanted {
				continue
			}

			var existing models.WebhookDelivery
			err := database.DB.Where(
				"vault_id = ? AND subscription_id = ? AND days_left = ? AND sent_date = ?",
				setting.VaultID, sub.ID, daysLeft, todayStr,
			).First(&existing).Error
			if err == nil {
				continue
			}

			text := webhook.BuildText(sub, daysLeft)
			if sendErr := webhook.Send(setting.WebhookURL, setting.WebhookPlatform, text); sendErr != nil {
				log.Printf("提醒 %s 失败: %v", sub.Name, sendErr)
				continue
			}

			delivery := models.WebhookDelivery{
				VaultID:        setting.VaultID,
				SubscriptionID: sub.ID,
				DaysLeft:       daysLeft,
				SentDate:       todayStr,
			}
			if createErr := database.DB.Create(&delivery).Error; createErr != nil {
				log.Printf("记录提醒发送失败: %v", createErr)
			}
		}
	}
	return nil
}
