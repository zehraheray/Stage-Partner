package routes

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"stagepartner/backend/handlers"
	"stagepartner/backend/middleware"
)

func Setup(r *gin.Engine) {
	r.Use(middleware.CORS())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "Render MCP Healthcheck: Live Live Live!"})
	})

	r.GET("/config/system", handlers.SystemStatus)
	r.GET("/config/models", handlers.SupportedModels)
	r.GET("/api/version", handlers.Version)
	r.GET("/api/ping", handlers.Ping)

	auth := r.Group("/auth")
	auth.Use(middleware.RateLimit(10, time.Minute))
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
		auth.POST("/refresh", handlers.RefreshToken)
		auth.POST("/logout", handlers.Logout)
		auth.PUT("/password", handlers.UpdatePassword)
		auth.PUT("/profile", handlers.UpdateProfile)
		auth.DELETE("/account", handlers.DeleteAccount)
	}

	r.GET("/user/profile", middleware.Auth(), handlers.GetProfile)

	llm := r.Group("/llm", middleware.Auth())
	llm.Use(middleware.RateLimit(60, time.Minute))
	{
		llm.POST("/log/raw-output", handlers.CreateLog)
		llm.GET("/logs", handlers.GetLogs)
		llm.GET("/analytics", handlers.GetAnalytics)
		llm.POST("/score/decision", handlers.ScoreDecision)
		llm.GET("/logs/:id", handlers.GetLog)
		llm.DELETE("/logs/clear", handlers.ClearLogs)
		llm.DELETE("/logs/:id", handlers.DeleteLog)
		llm.GET("/export", handlers.ExportLogs)
	}
}
