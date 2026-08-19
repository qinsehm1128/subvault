package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"sort"
	"strings"
	"time"

	"subvault/internal/database"
	"subvault/internal/fx"
	"subvault/internal/ical"
	"subvault/internal/models"
	"subvault/internal/renewal"
	"subvault/internal/webhook"

	"github.com/gin-gonic/gin"
)

type SettingsHandler struct{}

func NewSettingsHandler() *SettingsHandler {
	return &SettingsHandler{}
}

// === 标签管理 ===

func (h *SettingsHandler) GetTags(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var tags []models.Tag
	database.DB.Where("vault_id = ?", vaultID).Order("created_at asc").Find(&tags)

	if tags == nil {
		tags = []models.Tag{}
	}

	c.JSON(http.StatusOK, tags)
}

func (h *SettingsHandler) CreateTag(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var input struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "标签名称不能为空"})
		return
	}

	tag := models.Tag{
		VaultID: vaultID,
		Name:    input.Name,
		Color:   input.Color,
	}
	if tag.Color == "" {
		tag.Color = "#3B82F6"
	}

	if err := database.DB.Create(&tag).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建标签失败"})
		return
	}

	c.JSON(http.StatusCreated, tag)
}

func (h *SettingsHandler) UpdateTag(c *gin.Context) {
	vaultID := c.GetString("vaultId")
	tagID := c.Param("id")

	var tag models.Tag
	if err := database.DB.Where("id = ? AND vault_id = ?", tagID, vaultID).First(&tag).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "标签不存在"})
		return
	}

	var input struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的数据"})
		return
	}

	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Color != "" {
		updates["color"] = input.Color
	}

	database.DB.Model(&tag).Updates(updates)
	c.JSON(http.StatusOK, tag)
}

func (h *SettingsHandler) DeleteTag(c *gin.Context) {
	vaultID := c.GetString("vaultId")
	tagID := c.Param("id")

	result := database.DB.Where("id = ? AND vault_id = ?", tagID, vaultID).Delete(&models.Tag{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "标签不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// === 通知设置 ===

func (h *SettingsHandler) GetNotificationSettings(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var settings models.NotificationSetting
	result := database.DB.Where("vault_id = ?", vaultID).First(&settings)

	if result.Error != nil {
		c.JSON(http.StatusOK, gin.H{
			"enabled":           true,
			"daysBeforeList":    "1,3,7",
			"webhookEnabled":    false,
			"webhookUrl":        "",
			"webhookPlatform":   "auto",
			"webhookDaysBefore": "1,2,3",
			"webhookSecret":     "",
			"calendarToken":     "",
			"baseCurrency":      "CNY",
		})
		return
	}
	if settings.CalendarToken == "" {
		settings.CalendarToken = newCalendarToken()
		database.DB.Model(&settings).Update("calendar_token", settings.CalendarToken)
	}
	if settings.BaseCurrency == "" {
		settings.BaseCurrency = "CNY"
	}
	c.JSON(http.StatusOK, settings)
}

func (h *SettingsHandler) SaveNotificationSettings(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var input struct {
		Enabled           bool   `json:"enabled"`
		DaysBeforeList    string `json:"daysBeforeList"`
		WebhookEnabled    bool   `json:"webhookEnabled"`
		WebhookURL        string `json:"webhookUrl"`
		WebhookPlatform   string `json:"webhookPlatform"`
		WebhookDaysBefore string `json:"webhookDaysBefore"`
		WebhookSecret     string `json:"webhookSecret"`
		BaseCurrency      string `json:"baseCurrency"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的设置数据"})
		return
	}

	input.WebhookURL = strings.TrimSpace(input.WebhookURL)
	if input.WebhookEnabled && input.WebhookURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "启用 Webhook 时请填写地址"})
		return
	}
	if input.WebhookEnabled {
		if err := webhook.ValidateURL(input.WebhookURL); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	if input.WebhookPlatform == "" {
		input.WebhookPlatform = "auto"
	}
	if input.WebhookDaysBefore == "" {
		input.WebhookDaysBefore = "1,2,3"
	}
	if input.BaseCurrency == "" {
		input.BaseCurrency = "CNY"
	}

	var settings models.NotificationSetting
	result := database.DB.Where("vault_id = ?", vaultID).First(&settings)

	if result.Error != nil {
		settings = models.NotificationSetting{
			VaultID:           vaultID,
			Enabled:           input.Enabled,
			DaysBeforeList:    input.DaysBeforeList,
			WebhookEnabled:    input.WebhookEnabled,
			WebhookURL:        input.WebhookURL,
			WebhookPlatform:   input.WebhookPlatform,
			WebhookDaysBefore: input.WebhookDaysBefore,
			WebhookSecret:     input.WebhookSecret,
			CalendarToken:     newCalendarToken(),
			BaseCurrency:      input.BaseCurrency,
		}
		database.DB.Create(&settings)
	} else {
		updates := map[string]interface{}{
			"enabled":             input.Enabled,
			"days_before_list":    input.DaysBeforeList,
			"webhook_enabled":     input.WebhookEnabled,
			"webhook_url":         input.WebhookURL,
			"webhook_platform":    input.WebhookPlatform,
			"webhook_days_before": input.WebhookDaysBefore,
			"webhook_secret":      input.WebhookSecret,
			"base_currency":       input.BaseCurrency,
		}
		if settings.CalendarToken == "" {
			updates["calendar_token"] = newCalendarToken()
		}
		database.DB.Model(&settings).Updates(updates)
	}

	c.JSON(http.StatusOK, gin.H{"message": "设置已保存"})
}

func (h *SettingsHandler) TestWebhook(c *gin.Context) {
	var input struct {
		WebhookURL      string `json:"webhookUrl"`
		WebhookPlatform string `json:"webhookPlatform"`
		WebhookSecret   string `json:"webhookSecret"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请填写 Webhook 地址"})
		return
	}
	input.WebhookURL = strings.TrimSpace(input.WebhookURL)
	if input.WebhookURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请填写 Webhook 地址"})
		return
	}
	if err := webhook.Send(input.WebhookURL, input.WebhookPlatform, webhook.BuildTestText(), input.WebhookSecret); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "测试消息已发送"})
}

// === 到期提醒 ===

type UpcomingRenewal struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Cost        float64 `json:"cost"`
	Currency    string  `json:"currency"`
	RenewalDate string  `json:"renewalDate"`
	DaysLeft    int     `json:"daysLeft"`
}

func (h *SettingsHandler) GetUpcomingRenewals(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var subscriptions []models.Subscription
	database.DB.Where("vault_id = ? AND active = ?", vaultID, true).Find(&subscriptions)
	subscriptions = renewal.RotateAndSave(database.DB, subscriptions, renewal.Today())

	var upcoming []UpcomingRenewal
	today := renewal.Today()

	for _, sub := range subscriptions {
		if sub.FrequencyUnit == "PERMANENT" {
			continue
		}

		daysLeft, ok := renewal.DaysUntil(sub.RenewalDate, today)
		if !ok {
			continue
		}
		if daysLeft < 0 {
			daysLeft = 0
		}

		// 只返回30天内到期的
		if daysLeft <= 30 {
			upcoming = append(upcoming, UpcomingRenewal{
				ID:          sub.ID,
				Name:        sub.Name,
				Cost:        sub.Cost,
				Currency:    sub.Currency,
				RenewalDate: sub.RenewalDate,
				DaysLeft:    daysLeft,
			})
		}
	}

	// 按天数排序
	sort.Slice(upcoming, func(i, j int) bool {
		return upcoming[i].DaysLeft < upcoming[j].DaysLeft
	})

	if upcoming == nil {
		upcoming = []UpcomingRenewal{}
	}

	c.JSON(http.StatusOK, upcoming)
}

// === 数据分析 ===

type AnalyticsData struct {
	MonthlySpending   []MonthlySpend    `json:"monthlySpending"`
	CategoryBreakdown []CategorySpend   `json:"categoryBreakdown"`
	CurrencyBreakdown []CurrencySpend   `json:"currencyBreakdown"`
	TotalMonthly      float64           `json:"totalMonthly"`
	TotalYearly       float64           `json:"totalYearly"`
	SubscriptionCount int               `json:"subscriptionCount"`
	UpcomingCount     int               `json:"upcomingCount"`
}

type MonthlySpend struct {
	Month  string  `json:"month"`
	Amount float64 `json:"amount"`
}

type CategorySpend struct {
	Category   string  `json:"category"`
	Amount     float64 `json:"amount"`
	Percentage float64 `json:"percentage"`
	Count      int     `json:"count"`
}

type CurrencySpend struct {
	Currency string  `json:"currency"`
	Amount   float64 `json:"amount"`
	Count    int     `json:"count"`
}

func (h *SettingsHandler) GetAnalytics(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var subscriptions []models.Subscription
	database.DB.Where("vault_id = ?", vaultID).Find(&subscriptions)
	subscriptions = renewal.RotateAndSave(database.DB, subscriptions, renewal.Today())

	base := "CNY"
	var setting models.NotificationSetting
	if err := database.DB.Where("vault_id = ?", vaultID).First(&setting).Error; err == nil && setting.BaseCurrency != "" {
		base = setting.BaseCurrency
	}
	rates, _ := fx.RatesTo(base)

	categoryMap := make(map[string]float64)
	categoryCounts := make(map[string]int)
	currencyMap := make(map[string]float64)
	currencyCounts := make(map[string]int)
	var totalMonthly float64
	tracked := 0

	categoryBreakdown := make([]CategorySpend, 0)
	currencyBreakdown := make([]CurrencySpend, 0)
	monthlySpending := make([]MonthlySpend, 0)

	for _, sub := range subscriptions {
		if !sub.IsTracked() {
			continue
		}
		monthly := calculateMonthlyAmount(sub.Cost, sub.FrequencyAmount, sub.FrequencyUnit)
		monthly = fx.Convert(monthly, sub.Currency, base, rates)
		totalMonthly += monthly

		categoryMap[sub.Category] += monthly
		categoryCounts[sub.Category]++

		currencyMap[sub.Currency] += sub.Cost
		currencyCounts[sub.Currency]++
		tracked++
	}

	for cat, amount := range categoryMap {
		percentage := 0.0
		if totalMonthly > 0 {
			percentage = (amount / totalMonthly) * 100
		}
		categoryBreakdown = append(categoryBreakdown, CategorySpend{
			Category:   cat,
			Amount:     amount,
			Percentage: percentage,
			Count:      categoryCounts[cat],
		})
	}
	sort.Slice(categoryBreakdown, func(i, j int) bool {
		return categoryBreakdown[i].Amount > categoryBreakdown[j].Amount
	})

	for curr, amount := range currencyMap {
		currencyBreakdown = append(currencyBreakdown, CurrencySpend{
			Currency: curr,
			Amount:   amount,
			Count:    currencyCounts[curr],
		})
	}

	monthTotals := map[string]float64{}
	var events []models.RenewalEvent
	database.DB.Where("vault_id = ?", vaultID).Find(&events)
	for _, ev := range events {
		if len(ev.OccurredOn) < 7 {
			continue
		}
		month := ev.OccurredOn[:7]
		monthTotals[month] += fx.Convert(ev.Amount, ev.Currency, base, rates)
	}
	today := renewal.Today()
	for i := 5; i >= 0; i-- {
		month := today.AddDate(0, -i, 0).Format("2006-01")
		amount := monthTotals[month]
		if amount == 0 && i == 0 {
			amount = totalMonthly
		}
		monthlySpending = append(monthlySpending, MonthlySpend{Month: month, Amount: amount})
	}

	upcomingCount := 0
	for _, sub := range subscriptions {
		if !sub.IsTracked() || sub.FrequencyUnit == "PERMANENT" {
			continue
		}
		daysLeft, ok := renewal.DaysUntil(sub.RenewalDate, today)
		if ok && daysLeft <= 7 && daysLeft >= 0 {
			upcomingCount++
		}
	}

	c.JSON(http.StatusOK, AnalyticsData{
		MonthlySpending:   monthlySpending,
		CategoryBreakdown: categoryBreakdown,
		CurrencyBreakdown: currencyBreakdown,
		TotalMonthly:      totalMonthly,
		TotalYearly:       totalMonthly * 12,
		SubscriptionCount: tracked,
		UpcomingCount:     upcomingCount,
	})
}

func calculateMonthlyAmount(cost float64, amount int, unit string) float64 {
	switch unit {
	case "DAYS":
		return cost * 30 / float64(amount)
	case "WEEKS":
		return cost * 4.33 / float64(amount)
	case "MONTHS":
		return cost / float64(amount)
	case "YEARS":
		return cost / (12 * float64(amount))
	case "PERMANENT":
		return 0
	default:
		return cost
	}
}

func newCalendarToken() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return hex.EncodeToString([]byte(time.Now().Format("150405.000000000")))
	}
	return hex.EncodeToString(buf)
}

func (h *SettingsHandler) PublicCalendar(c *gin.Context) {
	token := strings.TrimSpace(c.Param("token"))
	if token == "" {
		c.String(http.StatusNotFound, "not found")
		return
	}
	var setting models.NotificationSetting
	if err := database.DB.Where("calendar_token = ?", token).First(&setting).Error; err != nil {
		c.String(http.StatusNotFound, "not found")
		return
	}
	var subscriptions []models.Subscription
	database.DB.Where("vault_id = ?", setting.VaultID).Find(&subscriptions)
	subscriptions = renewal.RotateAndSave(database.DB, subscriptions, renewal.Today())
	c.Header("Content-Type", "text/calendar; charset=utf-8")
	c.Header("Content-Disposition", "inline; filename=subvault.ics")
	c.String(http.StatusOK, ical.Build(subscriptions))
}

func (h *SettingsHandler) GetInsights(c *gin.Context) {
	vaultID := c.GetString("vaultId")
	var subscriptions []models.Subscription
	database.DB.Where("vault_id = ?", vaultID).Find(&subscriptions)
	subscriptions = renewal.RotateAndSave(database.DB, subscriptions, renewal.Today())

	today := renewal.Today()
	type Insight struct {
		Kind    string `json:"kind"`
		Title   string `json:"title"`
		Detail  string `json:"detail"`
		SubID   string `json:"subscriptionId,omitempty"`
		SubName string `json:"subscriptionName,omitempty"`
	}
	insights := make([]Insight, 0)

	byName := map[string][]models.Subscription{}
	bySite := map[string][]models.Subscription{}
	var totalMonthly float64
	var top models.Subscription
	var topMonthly float64

	for _, sub := range subscriptions {
		if !sub.IsTracked() {
			continue
		}
		key := strings.ToLower(strings.TrimSpace(sub.Name))
		byName[key] = append(byName[key], sub)
		if host := websiteHost(sub.Website); host != "" {
			bySite[host] = append(bySite[host], sub)
		}
		monthly := calculateMonthlyAmount(sub.Cost, sub.FrequencyAmount, sub.FrequencyUnit)
		totalMonthly += monthly
		if monthly > topMonthly {
			topMonthly = monthly
			top = sub
		}
		if days, ok := renewal.DaysUntil(sub.TrialEndsOn, today); ok && days >= 0 && days <= 7 {
			insights = append(insights, Insight{Kind: "trial", Title: sub.Name + " 试用即将结束", Detail: sub.TrialEndsOn, SubID: sub.ID, SubName: sub.Name})
		}
		if days, ok := renewal.DaysUntil(sub.PromoEndsOn, today); ok && days >= 0 && days <= 7 {
			insights = append(insights, Insight{Kind: "promo", Title: sub.Name + " 优惠即将结束", Detail: sub.PromoEndsOn, SubID: sub.ID, SubName: sub.Name})
		}
	}

	for _, group := range byName {
		if len(group) > 1 {
			insights = append(insights, Insight{Kind: "duplicate", Title: "可能重复：" + group[0].Name, Detail: "同名订阅超过 1 条", SubName: group[0].Name})
		}
	}
	for host, group := range bySite {
		if len(group) > 1 {
			insights = append(insights, Insight{Kind: "duplicate", Title: "同一网站多份订阅", Detail: host, SubName: group[0].Name})
		}
	}
	if totalMonthly > 0 && topMonthly/totalMonthly >= 0.4 {
		insights = append(insights, Insight{Kind: "spend", Title: top.Name + " 占月支出过高", Detail: "超过四成月度订阅支出", SubID: top.ID, SubName: top.Name})
	}

	var hikes []models.PriceHistory
	database.DB.Where("vault_id = ?", vaultID).Order("created_at desc").Limit(8).Find(&hikes)
	for _, hike := range hikes {
		if hike.NewCost <= hike.OldCost {
			continue
		}
		insights = append(insights, Insight{Kind: "price", Title: "发现涨价", Detail: "从原价上调", SubID: hike.SubscriptionID})
	}

	c.JSON(http.StatusOK, gin.H{"insights": insights})
}

func websiteHost(raw string) string {
	raw = strings.TrimSpace(strings.ToLower(raw))
	raw = strings.TrimPrefix(raw, "https://")
	raw = strings.TrimPrefix(raw, "http://")
	raw = strings.TrimPrefix(raw, "www.")
	if i := strings.IndexAny(raw, "/?"); i >= 0 {
		raw = raw[:i]
	}
	return raw
}

func (h *SettingsHandler) RotateCalendarToken(c *gin.Context) {
	vaultID := c.GetString("vaultId")
	token := newCalendarToken()
	var settings models.NotificationSetting
	if err := database.DB.Where("vault_id = ?", vaultID).First(&settings).Error; err != nil {
		settings = models.NotificationSetting{VaultID: vaultID, CalendarToken: token, BaseCurrency: "CNY"}
		database.DB.Create(&settings)
	} else {
		database.DB.Model(&settings).Update("calendar_token", token)
	}
	c.JSON(http.StatusOK, gin.H{"calendarToken": token})
}

