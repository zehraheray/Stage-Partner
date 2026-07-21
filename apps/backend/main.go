package main

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"stagepartner/backend/config"
	"stagepartner/backend/models"
)

// JWT Auth Middleware
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header gereklidir"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz token formatı (Bearer <token>)"})
			c.Abort()
			return
		}

		claims, err := config.ValidateToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Next()
	}
}

func main() {
	config.ConnectDatabase()

	// Tabloları Otomatik Migrate Et
	config.DB.AutoMigrate(&models.LlmLog{}, &models.User{})

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

	// Healthcheck
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "Render MCP Healthcheck: Live Live Live!"})
	})

	// --- AUTH ENDPOINTS ---
	auth := r.Group("/auth")
	{
		auth.POST("/register", func(c *gin.Context) {
			var input models.RegisterInput
			if err := c.ShouldBindJSON(&input); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Şifre şifrelenemedi"})
				return
			}

			user := models.User{
				Email:    input.Email,
				Password: string(hashedPassword),
				FullName: input.FullName,
			}

			if err := config.DB.Create(&user).Error; err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Bu e-posta adresi zaten kullanımda"})
				return
			}

			token, _ := config.GenerateToken(user.ID, user.Email)

			c.JSON(http.StatusOK, gin.H{
				"message": "Kayıt başarılı",
				"token":   token,
				"user":    user,
			})
		})

		auth.POST("/login", func(c *gin.Context) {
			var input models.LoginInput
			if err := c.ShouldBindJSON(&input); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			var user models.User
			if err := config.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz e-posta veya şifre"})
				return
			}

			if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz e-posta veya şifre"})
				return
			}

			token, _ := config.GenerateToken(user.ID, user.Email)

			c.JSON(http.StatusOK, gin.H{
				"message": "Giriş başarılı",
				"token":   token,
				"user":    user,
			})
		})
	}

	// --- KORUMALI KULLANICI PROFİL ENDPOINT'İ ---
	r.GET("/user/profile", AuthMiddleware(), func(c *gin.Context) {
		userID, _ := c.Get("userID")
		var user models.User
		config.DB.First(&user, userID)
		c.JSON(http.StatusOK, gin.H{"user": user})
	})

	// --- LLM ENDPOINTS ---
	r.POST("/llm/log/raw-output", func(c *gin.Context) {
		var input models.LlmLog
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		config.DB.Create(&input)
		c.JSON(http.StatusOK, gin.H{"data": input})
	})

	r.GET("/llm/logs", func(c *gin.Context) {
		var logs []models.LlmLog
		config.DB.Order("id desc").Find(&logs)
		c.JSON(http.StatusOK, gin.H{"data": logs})
	})

	// --- LLM ANALYTICS ENDPOINT ---
	r.GET("/llm/analytics", func(c *gin.Context) {
		type AnalyticsResult struct {
			TotalPrompts   int64   `json:"total_prompts"`
			AvgLatencyMs   float64 `json:"avg_latency_ms"`
			AvgScore       float64 `json:"avg_score"`
			ScoredPrompts  int64   `json:"scored_prompts"`
		}

		var totalPrompts int64
		var scoredPrompts int64
		var avgLatency float64
		var avgScore float64

		// Toplam prompt sayısı
		config.DB.Model(&models.LlmLog{}).Count(&totalPrompts)

		// Ortalama Latency
		config.DB.Model(&models.LlmLog{}).Select("COALESCE(AVG(latency_ms), 0)").Scan(&avgLatency)

		// Puanlanmış prompt sayısı ve ortalama skor
		config.DB.Model(&models.LlmLog{}).Where("score > 0").Count(&scoredPrompts)
		config.DB.Model(&models.LlmLog{}).Where("score > 0").Select("COALESCE(AVG(score), 0)").Scan(&avgScore)

		// En yüksek puanlı / en yeni loglar (Leaderboard)
		var topLogs []models.LlmLog
		config.DB.Order("score desc, id desc").Limit(5).Find(&topLogs)

		c.JSON(http.StatusOK, gin.H{
			"summary": AnalyticsResult{
				TotalPrompts:  totalPrompts,
				AvgLatencyMs:  avgLatency,
				AvgScore:      avgScore,
				ScoredPrompts: scoredPrompts,
			},
			"top_logs": topLogs,
		})
	})

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
			c.JSON(http.StatusNotFound, gin.H{"error": "Kayıt bulunamadı"})
			return
		}

		config.DB.Model(&logRecord).Update("score", input.Score)
		c.JSON(http.StatusOK, gin.H{"message": "Skor güncellendi", "data": logRecord})
	})

	r.Run(":8080")
}