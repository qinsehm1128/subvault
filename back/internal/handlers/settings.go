package handlers

import (
	"net/http"
	"sort"
	"time"

	"subvault/internal/database"
	"subvault/internal/models"

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
		// 返回默认设置
		c.JSON(http.StatusOK, gin.H{
			"enabled":        true,
			"daysBeforeList": "1,3,7",
		})
		return
	}

	c.JSON(http.StatusOK, settings)
}

func (h *SettingsHandler) SaveNotificationSettings(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var input struct {
		Enabled        bool   `json:"enabled"`
		DaysBeforeList string `json:"daysBeforeList"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的设置数据"})
		return
	}

	var settings models.NotificationSetting
	result := database.DB.Where("vault_id = ?", vaultID).First(&settings)

	if result.Error != nil {
		settings = models.NotificationSetting{
			VaultID:        vaultID,
			Enabled:        input.Enabled,
			DaysBeforeList: input.DaysBeforeList,
		}
		database.DB.Create(&settings)
	} else {
		database.DB.Model(&settings).Updates(map[string]interface{}{
			"enabled":          input.Enabled,
			"days_before_list": input.DaysBeforeList,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "设置已保存"})
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

	var upcoming []UpcomingRenewal
	now := time.Now()

	for _, sub := range subscriptions {
		if sub.FrequencyUnit == "PERMANENT" {
			continue
		}

		renewalDate, err := time.Parse("2006-01-02", sub.RenewalDate)
		if err != nil {
			continue
		}

		daysLeft := int(renewalDate.Sub(now).Hours() / 24)
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
	database.DB.Where("vault_id = ? AND active = ?", vaultID, true).Find(&subscriptions)

	// 计算月度支出
	categoryMap := make(map[string]float64)
	categoryCounts := make(map[string]int)
	currencyMap := make(map[string]float64)
	currencyCounts := make(map[string]int)
	var totalMonthly float64

	for _, sub := range subscriptions {
		monthly := calculateMonthlyAmount(sub.Cost, sub.FrequencyAmount, sub.FrequencyUnit)
		totalMonthly += monthly

		categoryMap[sub.Category] += monthly
		categoryCounts[sub.Category]++

		currencyMap[sub.Currency] += sub.Cost
		currencyCounts[sub.Currency]++
	}

	// 分类占比
	var categoryBreakdown []CategorySpend
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

	// 货币分布
	var currencyBreakdown []CurrencySpend
	for curr, amount := range currencyMap {
		currencyBreakdown = append(currencyBreakdown, CurrencySpend{
			Currency: curr,
			Amount:   amount,
			Count:    currencyCounts[curr],
		})
	}

	// 模拟过去6个月的支出趋势
	var monthlySpending []MonthlySpend
	now := time.Now()
	for i := 5; i >= 0; i-- {
		month := now.AddDate(0, -i, 0)
		monthlySpending = append(monthlySpending, MonthlySpend{
			Month:  month.Format("2006-01"),
			Amount: totalMonthly, // 简化处理，实际应该根据订阅创建时间计算
		})
	}

	// 计算即将到期数量
	upcomingCount := 0
	for _, sub := range subscriptions {
		if sub.FrequencyUnit == "PERMANENT" {
			continue
		}
		renewalDate, err := time.Parse("2006-01-02", sub.RenewalDate)
		if err != nil {
			continue
		}
		daysLeft := int(renewalDate.Sub(now).Hours() / 24)
		if daysLeft <= 7 && daysLeft >= 0 {
			upcomingCount++
		}
	}

	c.JSON(http.StatusOK, AnalyticsData{
		MonthlySpending:   monthlySpending,
		CategoryBreakdown: categoryBreakdown,
		CurrencyBreakdown: currencyBreakdown,
		TotalMonthly:      totalMonthly,
		TotalYearly:       totalMonthly * 12,
		SubscriptionCount: len(subscriptions),
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
