package router

import (
	"subvault/internal/config"
	"subvault/internal/handlers"
	"subvault/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Setup(cfg *config.Config) *gin.Engine {
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// CORS 配置
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// 全局速率限制
	r.Use(middleware.RateLimitMiddleware())

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "subvault-api"})
	})

	// API v1
	v1 := r.Group("/api/v1")
	{
		// 解锁（无需认证，但有更严格的速率限制）
		authHandler := handlers.NewAuthHandler(cfg)
		v1.POST("/unlock", middleware.AuthRateLimitMiddleware(), authHandler.Unlock)

		// 需要认证的路由
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware(cfg))
		{
			// 验证 token
			protected.GET("/verify", authHandler.VerifyToken)

			// Vault 数据
			vaultHandler := handlers.NewVaultHandler(cfg)
			protected.GET("/vault", vaultHandler.GetVault)

			// 订阅
			subs := protected.Group("/subscriptions")
			{
				subs.GET("", vaultHandler.GetSubscriptions)
				subs.POST("", vaultHandler.CreateSubscription)
				subs.PUT("/:id", vaultHandler.UpdateSubscription)
				subs.DELETE("/:id", vaultHandler.DeleteSubscription)
			}

			// 凭证
			creds := protected.Group("/credentials")
			{
				creds.GET("", vaultHandler.GetCredentials)
				creds.POST("", vaultHandler.CreateCredential)
				creds.PUT("/:id", vaultHandler.UpdateCredential)
				creds.DELETE("/:id", vaultHandler.DeleteCredential)
			}

			// AI 分析
			aiHandler := handlers.NewAIHandler(cfg)
			ai := protected.Group("/ai")
			{
				ai.GET("/config", aiHandler.GetAIConfig)
				ai.POST("/config", aiHandler.SaveAIConfig)
				ai.POST("/analyze", aiHandler.Analyze)
				ai.POST("/parse-subscription", aiHandler.ParseSubscription)
				ai.GET("/reports", aiHandler.GetReports)
				ai.GET("/chat", aiHandler.GetChatHistory)
				ai.POST("/chat", aiHandler.Chat)
				ai.DELETE("/chat", aiHandler.ClearChatHistory)
			}

			// 设置和分析
			settingsHandler := handlers.NewSettingsHandler()

			// 标签
			tags := protected.Group("/tags")
			{
				tags.GET("", settingsHandler.GetTags)
				tags.POST("", settingsHandler.CreateTag)
				tags.PUT("/:id", settingsHandler.UpdateTag)
				tags.DELETE("/:id", settingsHandler.DeleteTag)
			}

			// 通知设置
			protected.GET("/notifications/settings", settingsHandler.GetNotificationSettings)
			protected.POST("/notifications/settings", settingsHandler.SaveNotificationSettings)
			protected.GET("/notifications/upcoming", settingsHandler.GetUpcomingRenewals)

			// 数据分析
			protected.GET("/analytics", settingsHandler.GetAnalytics)
		}
	}

	return r
}
