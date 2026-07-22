package config

import (
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestMain(m *testing.M) {
	os.Setenv("JWT_SECRET", "test-secret-for-config")
	InitJWT()
	os.Exit(m.Run())
}

func TestGenerateToken(t *testing.T) {
	token, err := GenerateToken(1, "test@example.com")
	if err != nil {
		t.Fatalf("GenerateToken returned error: %v", err)
	}
	if token == "" {
		t.Fatal("GenerateToken returned empty token")
	}
}

func TestValidateToken(t *testing.T) {
	token, err := GenerateToken(42, "user@example.com")
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	claims, err := ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken returned error: %v", err)
	}
	if claims.UserID != 42 {
		t.Errorf("expected UserID 42, got %d", claims.UserID)
	}
	if claims.Email != "user@example.com" {
		t.Errorf("expected Email user@example.com, got %s", claims.Email)
	}
}

func TestValidateToken_Invalid(t *testing.T) {
	_, err := ValidateToken("not-a-real-token")
	if err == nil {
		t.Fatal("expected error for invalid token, got nil")
	}
}

func TestValidateToken_WrongSecret(t *testing.T) {
	oldSecret := jwtSecret
	jwtSecret = []byte("other-secret")
	token, _ := GenerateToken(1, "a@b.com")
	jwtSecret = oldSecret

	_, err := ValidateToken(token)
	if err == nil {
		t.Fatal("expected error for token signed with wrong secret")
	}
}

func TestValidateToken_Expired(t *testing.T) {
	old := jwtSecret
	jwtSecret = []byte("test-secret")
	claims := &Claims{
		UserID: 1,
		Email:  "expired@test.com",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString(jwtSecret)
	jwtSecret = old

	_, err := ValidateToken(tokenString)
	if err == nil {
		t.Fatal("expected error for expired token")
	}
}
