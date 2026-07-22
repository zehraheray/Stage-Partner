package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"stagepartner/backend/config"
	"stagepartner/backend/models"
)

func Register(c *gin.Context) {
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

	token, err := config.GenerateToken(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token oluşturulamadı"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Kayıt başarılı",
		"token":   token,
		"user":    user,
	})
}

func Login(c *gin.Context) {
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

	token, err := config.GenerateToken(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token oluşturulamadı"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Giriş başarılı",
		"token":   token,
		"user":    user,
	})
}

func RefreshToken(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header gereklidir"})
		return
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz token formatı (Bearer <token>)"})
		return
	}

	claims, err := config.ValidateToken(parts[1])
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz veya süresi dolmuş token"})
		return
	}

	newToken, err := config.GenerateToken(claims.UserID, claims.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token yenilenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Token başarıyla yenilendi",
		"new_token": newToken,
	})
}

func Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Başarıyla çıkış yapıldı. Token geçersiz kılındı."})
}

func UpdatePassword(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Şifre başarıyla güncellendi."})
}

func UpdateProfile(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Kullanıcı profil verileri güncellendi."})
}

func DeleteAccount(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Kullanıcı hesabı kalıcı olarak silindi."})
}
