package testutil

import (
	"os"
	"testing"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"stagepartner/backend/config"
	"stagepartner/backend/models"
)

func SetupTestEnv(t *testing.T) func() {
	t.Helper()

	os.Setenv("JWT_SECRET", "test-secret-key-for-testing")
	config.InitJWT()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal("failed to open test database:", err)
	}

	db.AutoMigrate(&models.User{}, &models.LlmLog{})
	config.DB = db

	return func() {
		config.DB = nil
		os.Unsetenv("JWT_SECRET")
	}
}

func SeedUser(t *testing.T, email, password, fullName string) models.User {
	t.Helper()

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatal("failed to hash password:", err)
	}

	user := models.User{
		Email:    email,
		Password: string(hashed),
		FullName: fullName,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		t.Fatal("failed to seed user:", err)
	}

	return user
}

func SeedLog(t *testing.T, prompt, response string, latencyMs, score int) models.LlmLog {
	t.Helper()

	log := models.LlmLog{
		Prompt:    prompt,
		Response:  response,
		LatencyMs: latencyMs,
		Score:     score,
	}

	if err := config.DB.Create(&log).Error; err != nil {
		t.Fatal("failed to seed log:", err)
	}

	return log
}

func MakeToken(t *testing.T, userID uint, email string) string {
	t.Helper()

	token, err := config.GenerateToken(userID, email)
	if err != nil {
		t.Fatal("failed to generate token:", err)
	}

	return token
}
