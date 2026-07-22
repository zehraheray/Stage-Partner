package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"stagepartner/backend/testutil"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestRegister_Success(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	body, _ := json.Marshal(map[string]string{
		"email":     "new@example.com",
		"password":  "secret123",
		"full_name": "Test User",
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/auth/register", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	Register(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["message"] == nil {
		t.Error("expected message in response")
	}
	if resp["token"] == nil {
		t.Error("expected token in response")
	}
}

func TestRegister_DuplicateEmail(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	testutil.SeedUser(t, "dup@example.com", "pass123", "Dup User")

	body, _ := json.Marshal(map[string]string{
		"email":    "dup@example.com",
		"password": "pass123",
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/auth/register", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	Register(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestRegister_InvalidEmail(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	body, _ := json.Marshal(map[string]string{
		"email":    "not-an-email",
		"password": "pass123",
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/auth/register", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	Register(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestRegister_ShortPassword(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	body, _ := json.Marshal(map[string]string{
		"email":    "user@example.com",
		"password": "ab",
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/auth/register", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	Register(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestLogin_Success(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	testutil.SeedUser(t, "login@example.com", "password123", "Login User")

	body, _ := json.Marshal(map[string]string{
		"email":    "login@example.com",
		"password": "password123",
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/auth/login", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	Login(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["token"] == nil {
		t.Error("expected token in response")
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	testutil.SeedUser(t, "login@example.com", "password123", "Login User")

	body, _ := json.Marshal(map[string]string{
		"email":    "login@example.com",
		"password": "wrongpassword",
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/auth/login", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	Login(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestLogin_NonexistentUser(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	body, _ := json.Marshal(map[string]string{
		"email":    "nobody@example.com",
		"password": "password123",
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/auth/login", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	Login(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRefreshToken_Success(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	token := testutil.MakeToken(t, 1, "test@example.com")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/auth/refresh", nil)
	c.Request.Header.Set("Authorization", "Bearer "+token)

	RefreshToken(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["new_token"] == nil || resp["new_token"] == "" {
		t.Error("expected new_token in response")
	}
}

func TestRefreshToken_MissingHeader(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/auth/refresh", nil)

	RefreshToken(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRefreshToken_InvalidToken(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/auth/refresh", nil)
	c.Request.Header.Set("Authorization", "Bearer garbage-token")

	RefreshToken(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}
