package handlers

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"subvault/internal/config"
	"subvault/internal/crypto"
	"subvault/internal/database"
	"subvault/internal/models"

	"github.com/gin-gonic/gin"
)

type AIHandler struct {
	cfg *config.Config
}

func NewAIHandler(cfg *config.Config) *AIHandler {
	return &AIHandler{cfg: cfg}
}

// GetAIConfig 获取 AI 配置
func (h *AIHandler) GetAIConfig(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var aiConfig models.AIConfig
	result := database.DB.Where("vault_id = ?", vaultID).First(&aiConfig)

	if result.Error != nil {
		c.JSON(http.StatusOK, models.AIConfig{
			VaultID: vaultID,
			BaseURL: "",
			APIKey:  "",
			Model:   "",
		})
		return
	}

	// 解密 API Key 后隐藏部分显示
	decryptedKey := ""
	if aiConfig.APIKey != "" {
		decrypted, err := crypto.Decrypt(aiConfig.APIKey, h.cfg.EncryptionKey)
		if err == nil && len(decrypted) > 8 {
			decryptedKey = decrypted[:4] + "****" + decrypted[len(decrypted)-4:]
		} else if err == nil {
			decryptedKey = "****"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"id":      aiConfig.ID,
		"vaultId": aiConfig.VaultID,
		"baseUrl": aiConfig.BaseURL,
		"apiKey":  decryptedKey,
		"model":   aiConfig.Model,
	})
}

// SaveAIConfig 保存 AI 配置
func (h *AIHandler) SaveAIConfig(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var input struct {
		BaseURL string `json:"baseUrl"`
		APIKey  string `json:"apiKey"`
		Model   string `json:"model"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的配置数据"})
		return
	}

	var aiConfig models.AIConfig
	result := database.DB.Where("vault_id = ?", vaultID).First(&aiConfig)

	// 加密 API Key
	encryptedKey := ""
	if !strings.Contains(input.APIKey, "****") && input.APIKey != "" {
		encrypted, err := crypto.Encrypt(input.APIKey, h.cfg.EncryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "加密失败"})
			return
		}
		encryptedKey = encrypted
	}

	if result.Error != nil {
		aiConfig = models.AIConfig{
			VaultID: vaultID,
			BaseURL: input.BaseURL,
			APIKey:  encryptedKey,
			Model:   input.Model,
		}
		if err := database.DB.Create(&aiConfig).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "保存配置失败"})
			return
		}
	} else {
		updates := map[string]interface{}{
			"base_url": input.BaseURL,
			"model":    input.Model,
		}
		if encryptedKey != "" {
			updates["api_key"] = encryptedKey
		}
		database.DB.Model(&aiConfig).Updates(updates)
	}

	c.JSON(http.StatusOK, gin.H{"message": "配置已保存"})
}

// getDecryptedAPIKey 获取解密后的 API Key
func (h *AIHandler) getDecryptedAPIKey(aiConfig models.AIConfig) (string, error) {
	if aiConfig.APIKey == "" {
		return "", fmt.Errorf("API Key 未配置")
	}
	return crypto.Decrypt(aiConfig.APIKey, h.cfg.EncryptionKey)
}

// GetChatHistory 获取对话历史
func (h *AIHandler) GetChatHistory(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var chats []models.AIChat
	database.DB.Where("vault_id = ?", vaultID).Order("created_at asc").Find(&chats)

	if chats == nil {
		chats = []models.AIChat{}
	}

	c.JSON(http.StatusOK, chats)
}

// ClearChatHistory 清空对话历史
func (h *AIHandler) ClearChatHistory(c *gin.Context) {
	vaultID := c.GetString("vaultId")
	database.DB.Where("vault_id = ?", vaultID).Delete(&models.AIChat{})
	c.JSON(http.StatusOK, gin.H{"message": "对话已清空"})
}

// Chat 发送对话消息
func (h *AIHandler) Chat(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var input struct {
		Message string `json:"message"`
		Stream  bool   `json:"stream"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.Message == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "消息不能为空"})
		return
	}

	// 获取 AI 配置
	var aiConfig models.AIConfig
	if err := database.DB.Where("vault_id = ?", vaultID).First(&aiConfig).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请先配置 AI 服务"})
		return
	}

	if aiConfig.BaseURL == "" || aiConfig.APIKey == "" || aiConfig.Model == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "AI 配置不完整"})
		return
	}

	// 解密 API Key
	decryptedKey, err := h.getDecryptedAPIKey(aiConfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解密 API Key 失败"})
		return
	}

	// 保存用户消息
	userChat := models.AIChat{
		VaultID: vaultID,
		Role:    "user",
		Content: input.Message,
	}
	database.DB.Create(&userChat)

	// 获取订阅数据作为上下文
	var subscriptions []models.Subscription
	database.DB.Where("vault_id = ?", vaultID).Find(&subscriptions)

	var subsContext string
	if len(subscriptions) > 0 {
		var subsList []string
		for _, s := range subscriptions {
			subsList = append(subsList, fmt.Sprintf("%s (%v %s / %d %s)", s.Name, s.Cost, s.Currency, s.FrequencyAmount, s.FrequencyUnit))
		}
		subsContext = fmt.Sprintf("\n\n用户当前的订阅列表:\n%s", strings.Join(subsList, "\n"))
	}

	// 获取历史对话
	var history []models.AIChat
	database.DB.Where("vault_id = ?", vaultID).Order("created_at asc").Limit(20).Find(&history)

	// 构建消息
	messages := []openAIMessage{
		{Role: "system", Content: "你是一个专业的个人财务顾问助手，帮助用户管理和优化他们的订阅支出。请用简体中文回复，保持友好和专业。支持使用 Markdown 格式回复。" + subsContext},
	}
	for _, chatHistory := range history {
		messages = append(messages, openAIMessage{Role: chatHistory.Role, Content: chatHistory.Content})
	}

	// 流式输出
	if input.Stream {
		h.streamChat(c, aiConfig.BaseURL, decryptedKey, aiConfig.Model, messages, vaultID)
		return
	}

	// 非流式调用
	reply, err := callOpenAIChatAPI(aiConfig.BaseURL, decryptedKey, aiConfig.Model, messages)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 保存助手回复
	assistantChat := models.AIChat{
		VaultID: vaultID,
		Role:    "assistant",
		Content: reply,
	}
	database.DB.Create(&assistantChat)

	c.JSON(http.StatusOK, gin.H{
		"reply": reply,
		"chat":  assistantChat,
	})
}

// streamChat 流式对话
func (h *AIHandler) streamChat(c *gin.Context, baseURL, apiKey, model string, messages []openAIMessage, vaultID string) {
	baseURL = strings.TrimSuffix(baseURL, "/")
	if !strings.HasSuffix(baseURL, "/v1") && !strings.HasSuffix(baseURL, "/chat/completions") {
		if !strings.Contains(baseURL, "/v1") {
			baseURL += "/v1"
		}
	}
	if !strings.HasSuffix(baseURL, "/chat/completions") {
		baseURL += "/chat/completions"
	}

	reqBody := map[string]interface{}{
		"model":    model,
		"messages": messages,
		"stream":   true,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "请求序列化失败"})
		return
	}

	req, err := http.NewRequest("POST", baseURL, bytes.NewBuffer(jsonData))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建请求失败"})
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Accept", "text/event-stream")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "API 请求失败"})
		return
	}
	defer resp.Body.Close()

	// 设置 SSE 响应头
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	var fullContent strings.Builder
	reader := bufio.NewReader(resp.Body)

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			break
		}

		line = strings.TrimSpace(line)
		if line == "" || line == "data: [DONE]" {
			if line == "data: [DONE]" {
				c.Writer.Write([]byte("data: [DONE]\n\n"))
				c.Writer.Flush()
			}
			continue
		}

		if strings.HasPrefix(line, "data: ") {
			data := strings.TrimPrefix(line, "data: ")
			var chunk struct {
				Choices []struct {
					Delta struct {
						Content string `json:"content"`
					} `json:"delta"`
				} `json:"choices"`
			}

			if err := json.Unmarshal([]byte(data), &chunk); err == nil {
				if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
					content := chunk.Choices[0].Delta.Content
					fullContent.WriteString(content)
					c.Writer.Write([]byte(fmt.Sprintf("data: %s\n\n", data)))
					c.Writer.Flush()
				}
			}
		}
	}

	// 保存完整回复
	if fullContent.Len() > 0 {
		assistantChat := models.AIChat{
			VaultID: vaultID,
			Role:    "assistant",
			Content: fullContent.String(),
		}
		database.DB.Create(&assistantChat)
	}
}

// GetReports 获取历史审计报告
func (h *AIHandler) GetReports(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var reports []models.AIReport
	database.DB.Where("vault_id = ?", vaultID).Order("created_at desc").Limit(10).Find(&reports)

	if reports == nil {
		reports = []models.AIReport{}
	}

	// 解析 JSON 字段
	var result []map[string]interface{}
	for _, r := range reports {
		var categories []models.CategoryAnalysis
		var insights []string
		json.Unmarshal([]byte(r.Categories), &categories)
		json.Unmarshal([]byte(r.Insights), &insights)

		result = append(result, map[string]interface{}{
			"id":           r.ID,
			"totalMonthly": r.TotalMonthly,
			"totalYearly":  r.TotalYearly,
			"categories":   categories,
			"insights":     insights,
			"createdAt":    r.CreatedAt,
		})
	}

	if result == nil {
		result = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, result)
}

// Analyze 执行 AI 分析并保存报告
func (h *AIHandler) Analyze(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var aiConfig models.AIConfig
	if err := database.DB.Where("vault_id = ?", vaultID).First(&aiConfig).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请先配置 AI 服务"})
		return
	}

	if aiConfig.BaseURL == "" || aiConfig.APIKey == "" || aiConfig.Model == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "AI 配置不完整"})
		return
	}

	// 解密 API Key
	decryptedKey, err := h.getDecryptedAPIKey(aiConfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解密 API Key 失败"})
		return
	}

	var subscriptions []models.Subscription
	database.DB.Where("vault_id = ?", vaultID).Find(&subscriptions)

	if len(subscriptions) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "暂无订阅数据"})
		return
	}

	var subsList []string
	for _, s := range subscriptions {
		subsList = append(subsList, fmt.Sprintf("%s (%v %s / %d %s)", s.Name, s.Cost, s.Currency, s.FrequencyAmount, s.FrequencyUnit))
	}

	prompt := fmt.Sprintf(`请分析以下订阅列表。请务必使用**简体中文**回复，并严格按照 JSON 格式返回。

1. 计算预估的每月总支出（将年度订阅除以12进行分摊）。
2. 计算预估的每年总支出。
3. 将它们归类到逻辑类别中（例如：娱乐、工具、软件服务、生活缴费等），并计算该类别的每月总支出以及占总预算的百分比。
4. 根据这个具体的订阅组合，提供3条简短、有策略性的省钱建议或财务洞察。

订阅列表:
%s

请严格按照以下 JSON 格式返回（不要包含任何其他文字）:
{
  "totalMonthly": 数字,
  "totalYearly": 数字,
  "categories": [
    {"name": "类别名称", "amount": 每月支出数字, "percentage": 百分比数字}
  ],
  "insights": ["建议1", "建议2", "建议3"]
}`, strings.Join(subsList, "\n"))

	result, err := callOpenAIAPI(aiConfig.BaseURL, decryptedKey, aiConfig.Model, prompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 保存报告
	categoriesJSON, _ := json.Marshal(result.Categories)
	insightsJSON, _ := json.Marshal(result.Insights)

	report := models.AIReport{
		VaultID:      vaultID,
		TotalMonthly: result.TotalMonthly,
		TotalYearly:  result.TotalYearly,
		Categories:   string(categoriesJSON),
		Insights:     string(insightsJSON),
	}
	database.DB.Create(&report)

	c.JSON(http.StatusOK, result)
}


// OpenAI API 结构
type openAIRequest struct {
	Model    string          `json:"model"`
	Messages []openAIMessage `json:"messages"`
}

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func callOpenAIChatAPI(baseURL, apiKey, model string, messages []openAIMessage) (string, error) {
	baseURL = strings.TrimSuffix(baseURL, "/")
	if !strings.HasSuffix(baseURL, "/v1") && !strings.HasSuffix(baseURL, "/chat/completions") {
		if !strings.Contains(baseURL, "/v1") {
			baseURL += "/v1"
		}
	}
	if !strings.HasSuffix(baseURL, "/chat/completions") {
		baseURL += "/chat/completions"
	}

	reqBody := openAIRequest{
		Model:    model,
		Messages: messages,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("请求序列化失败: %v", err)
	}

	req, err := http.NewRequest("POST", baseURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("创建请求失败: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("API 请求失败: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %v", err)
	}

	var openAIResp openAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		return "", fmt.Errorf("解析响应失败: %v", err)
	}

	if openAIResp.Error != nil {
		return "", fmt.Errorf("API 错误: %s", openAIResp.Error.Message)
	}

	if len(openAIResp.Choices) == 0 {
		return "", fmt.Errorf("API 返回空结果")
	}

	return openAIResp.Choices[0].Message.Content, nil
}

// ParseSubscription AI 解析订阅信息（支持文本和图片）
func (h *AIHandler) ParseSubscription(c *gin.Context) {
	vaultID := c.GetString("vaultId")

	var aiConfig models.AIConfig
	if err := database.DB.Where("vault_id = ?", vaultID).First(&aiConfig).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请先配置 AI 服务"})
		return
	}

	if aiConfig.BaseURL == "" || aiConfig.APIKey == "" || aiConfig.Model == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "AI 配置不完整"})
		return
	}

	// 解密 API Key
	decryptedKey, err := h.getDecryptedAPIKey(aiConfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解密 API Key 失败"})
		return
	}

	var input struct {
		Text      string `json:"text"`      // 文本描述
		ImageData string `json:"imageData"` // Base64 图片数据
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
		return
	}

	if input.Text == "" && input.ImageData == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供文本描述或图片"})
		return
	}

	// 获取现有标签
	var existingTags []models.Tag
	database.DB.Where("vault_id = ?", vaultID).Find(&existingTags)
	var tagNames []string
	for _, t := range existingTags {
		tagNames = append(tagNames, t.Name)
	}
	tagsContext := ""
	if len(tagNames) > 0 {
		tagsContext = fmt.Sprintf("\n\n用户已有的分类标签: %s", strings.Join(tagNames, ", "))
	}

	prompt := fmt.Sprintf(`请从以下内容中提取订阅服务信息。请务必使用**简体中文**回复，并严格按照 JSON 格式返回。

需要提取的信息：
1. name: 服务名称
2. cost: 金额（数字）
3. currency: 货币类型（CNY/USD/EUR/HKD，默认 CNY）
4. frequencyAmount: 周期数量（默认 1）
5. frequencyUnit: 周期单位（DAYS/WEEKS/MONTHS/YEARS/PERMANENT，默认 MONTHS）
6. website: 网站地址（如果有）
7. category: 分类标签（请根据服务类型智能推荐一个合适的分类，如：娱乐、工具、软件、学习、生活、工作、云服务、音乐、视频、游戏、存储、开发等）
%s

请严格按照以下 JSON 格式返回（不要包含任何其他文字）:
{
  "name": "服务名称",
  "cost": 金额数字,
  "currency": "货币代码",
  "frequencyAmount": 周期数量,
  "frequencyUnit": "周期单位",
  "website": "网站地址或空字符串",
  "category": "分类标签"
}

如果无法识别某些信息，请使用合理的默认值。`, tagsContext)

	var result map[string]interface{}

	if input.ImageData != "" {
		// 使用视觉模型解析图片
		result, err = callOpenAIVisionAPI(aiConfig.BaseURL, decryptedKey, aiConfig.Model, prompt, input.ImageData)
	} else {
		// 纯文本解析
		fullPrompt := prompt + "\n\n用户输入内容:\n" + input.Text
		result, err = callOpenAIParseAPI(aiConfig.BaseURL, decryptedKey, aiConfig.Model, fullPrompt)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 检查分类标签是否存在，不存在则创建
	if category, ok := result["category"].(string); ok && category != "" {
		tagExists := false
		for _, t := range existingTags {
			if t.Name == category {
				tagExists = true
				break
			}
		}
		if !tagExists {
			// 自动创建新标签
			colors := []string{"#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"}
			newTag := models.Tag{
				VaultID: vaultID,
				Name:    category,
				Color:   colors[len(existingTags)%len(colors)],
			}
			database.DB.Create(&newTag)
			result["tagCreated"] = true
			result["newTag"] = map[string]string{
				"id":    newTag.ID,
				"name":  newTag.Name,
				"color": newTag.Color,
			}
		}
	}

	c.JSON(http.StatusOK, result)
}

// callOpenAIVisionAPI 调用视觉模型 API
func callOpenAIVisionAPI(baseURL, apiKey, model, prompt, imageData string) (map[string]interface{}, error) {
	baseURL = strings.TrimSuffix(baseURL, "/")
	if !strings.HasSuffix(baseURL, "/v1") && !strings.HasSuffix(baseURL, "/chat/completions") {
		if !strings.Contains(baseURL, "/v1") {
			baseURL += "/v1"
		}
	}
	if !strings.HasSuffix(baseURL, "/chat/completions") {
		baseURL += "/chat/completions"
	}

	// 构建多模态消息
	content := []map[string]interface{}{
		{
			"type": "text",
			"text": prompt,
		},
		{
			"type": "image_url",
			"image_url": map[string]string{
				"url": imageData, // 已经是 data:image/xxx;base64,xxx 格式
			},
		},
	}

	reqBody := map[string]interface{}{
		"model": model,
		"messages": []map[string]interface{}{
			{
				"role":    "user",
				"content": content,
			},
		},
		"max_tokens": 1000,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("请求序列化失败: %v", err)
	}

	req, err := http.NewRequest("POST", baseURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("API 请求失败: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %v", err)
	}

	var openAIResp openAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %v", err)
	}

	if openAIResp.Error != nil {
		return nil, fmt.Errorf("API 错误: %s", openAIResp.Error.Message)
	}

	if len(openAIResp.Choices) == 0 {
		return nil, fmt.Errorf("API 返回空结果")
	}

	content_str := openAIResp.Choices[0].Message.Content
	return parseJSONResponse(content_str)
}

// callOpenAIParseAPI 调用文本解析 API
func callOpenAIParseAPI(baseURL, apiKey, model, prompt string) (map[string]interface{}, error) {
	messages := []openAIMessage{
		{Role: "user", Content: prompt},
	}

	content, err := callOpenAIChatAPI(baseURL, apiKey, model, messages)
	if err != nil {
		return nil, err
	}

	return parseJSONResponse(content)
}

// parseJSONResponse 解析 JSON 响应
func parseJSONResponse(content string) (map[string]interface{}, error) {
	content = strings.TrimSpace(content)
	if strings.HasPrefix(content, "```json") {
		content = strings.TrimPrefix(content, "```json")
		content = strings.TrimSuffix(content, "```")
		content = strings.TrimSpace(content)
	} else if strings.HasPrefix(content, "```") {
		content = strings.TrimPrefix(content, "```")
		content = strings.TrimSuffix(content, "```")
		content = strings.TrimSpace(content)
	}

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, fmt.Errorf("解析结果失败: %v, 原始内容: %s", err, content)
	}

	return result, nil
}

func callOpenAIAPI(baseURL, apiKey, model, prompt string) (*models.AnalysisResult, error) {
	messages := []openAIMessage{
		{Role: "user", Content: prompt},
	}

	content, err := callOpenAIChatAPI(baseURL, apiKey, model, messages)
	if err != nil {
		return nil, err
	}

	// 处理 markdown 代码块
	content = strings.TrimSpace(content)
	if strings.HasPrefix(content, "```json") {
		content = strings.TrimPrefix(content, "```json")
		content = strings.TrimSuffix(content, "```")
		content = strings.TrimSpace(content)
	} else if strings.HasPrefix(content, "```") {
		content = strings.TrimPrefix(content, "```")
		content = strings.TrimSuffix(content, "```")
		content = strings.TrimSpace(content)
	}

	var result models.AnalysisResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, fmt.Errorf("解析分析结果失败: %v", err)
	}

	return &result, nil
}
