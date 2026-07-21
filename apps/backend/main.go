package main

import (
	"net/http"
	"github.com/gin-gonic/gin"
	"stagepartner/backend/config"
	"stagepartner/backend/models"
)

func main() {
	// 1. Veritabanına Bağlan
	config.ConnectDatabase()

	// 2. Tabloları Otomatik Oluştur (Migration)
	config.DB.AutoMigrate(&models.LlmLog{})

	r := gin.Default()

	// CORS Middleware
	r.Use(func(c *gin.Context) {
	    c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
	    c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	    c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	    if c.Request.Method == "OPTIONS" {
	        c.AbortWithStatus(200)
	        return
	    }
	    c.Next()
	})
	
	// Healthcheck Endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "Render MCP Healthcheck: Live Live Live!"})
	})

	// Logları Kaydetme (POST /llm/log/raw-output)
	r.POST("/llm/log/raw-output", func(c *gin.Context) {
		var input models.LlmLog
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		config.DB.Create(&input)
		c.JSON(http.StatusOK, gin.H{"data": input})
	})

	// Logları Listeleme (GET /llm/logs)
	r.GET("/llm/logs", func(c *gin.Context) {
		var logs []models.LlmLog
		config.DB.Order("id desc").Find(&logs)
		c.JSON(http.StatusOK, gin.H{"data": logs})
	})

	// Decision Score Güncelleme (POST /llm/score/decision)
	r.POST("/llm/score/decision", func(c *gin.Context) {
		type ScoreInput struct {
			ID    uint `json:"id" binding:"required"`
			Score int  `json:"score" binding:"required"`
		}
		var input ScoreInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		var logRecord models.LlmLog
		if err := config.DB.First(&logRecord, input.ID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Kayit bulunamadi"})
			return
		}

		config.DB.Model(&logRecord).Update("score", input.Score)
		c.JSON(http.StatusOK, gin.H{"message": "Skor basariyla güncellendi", "data": logRecord})
	})

	r.Run(":8080")
}
