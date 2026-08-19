package ical

import (
	"fmt"
	"strings"

	"subvault/internal/models"
	"subvault/internal/renewal"
)

func Build(subs []models.Subscription) string {
	var b strings.Builder
	b.WriteString("BEGIN:VCALENDAR\r\n")
	b.WriteString("VERSION:2.0\r\n")
	b.WriteString("PRODID:-//SubVault//Renewals//CN\r\n")
	b.WriteString("CALSCALE:GREGORIAN\r\n")
	b.WriteString("X-WR-CALNAME:SubVault 续费\r\n")

	today := renewal.Today()
	for _, sub := range subs {
		if !sub.IsTracked() || sub.FrequencyUnit == "PERMANENT" || sub.RenewalDate == "" {
			continue
		}
		date := strings.ReplaceAll(sub.RenewalDate, "-", "")
		uid := fmt.Sprintf("%s@subvault", sub.ID)
		summary := escape(fmt.Sprintf("%s 续费 %s", sub.Name, formatCost(sub)))
		desc := escape(strings.TrimSpace(strings.Join([]string{
			sub.Category,
			sub.PaymentMethod,
			sub.CancelURL,
		}, " · ")))
		b.WriteString("BEGIN:VEVENT\r\n")
		b.WriteString("UID:" + uid + "\r\n")
		b.WriteString("DTSTAMP:" + renewal.FormatDate(today) + "T000000Z\r\n")
		b.WriteString("DTSTART;VALUE=DATE:" + date + "\r\n")
		b.WriteString("SUMMARY:" + summary + "\r\n")
		if desc != "" {
			b.WriteString("DESCRIPTION:" + desc + "\r\n")
		}
		b.WriteString("END:VEVENT\r\n")

		if sub.TrialEndsOn != "" {
			td := strings.ReplaceAll(sub.TrialEndsOn, "-", "")
			b.WriteString("BEGIN:VEVENT\r\n")
			b.WriteString("UID:" + sub.ID + "-trial@subvault\r\n")
			b.WriteString("DTSTART;VALUE=DATE:" + td + "\r\n")
			b.WriteString("SUMMARY:" + escape(sub.Name+" 试用结束") + "\r\n")
			b.WriteString("END:VEVENT\r\n")
		}
	}

	b.WriteString("END:VCALENDAR\r\n")
	return b.String()
}

func escape(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, "\n", `\n`)
	s = strings.ReplaceAll(s, ",", `\,`)
	s = strings.ReplaceAll(s, ";", `\;`)
	return s
}

func formatCost(sub models.Subscription) string {
	return fmt.Sprintf("%.2f %s", sub.Cost, sub.Currency)
}
