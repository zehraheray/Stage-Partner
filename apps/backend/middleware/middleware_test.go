package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"

	"stagepartner/backend/testutil"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestAuth_ValidToken(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	token := testutil.MakeToken(t, 1, "test@example.com")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/test", nil)
	c.Request.Header.Set("Authorization", "Bearer "+token)

	Auth()(c)

	if w.Code == http.StatusUnauthorized {
		t.Fatal("expected request to pass, got 401")
	}
	if v, ok := c.Get("userID"); !ok || v.(uint) != 1 {
		t.Errorf("expected userID=1 in context, got %v", v)
	}
	if v, ok := c.Get("userEmail"); !ok || v.(string) != "test@example.com" {
		t.Errorf("expected userEmail=test@example.com in context, got %v", v)
	}
}

func TestAuth_MissingHeader(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/test", nil)

	Auth()(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuth_BadFormat(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/test", nil)
	c.Request.Header.Set("Authorization", "NotBearer")

	Auth()(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuth_InvalidToken(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/test", nil)
	c.Request.Header.Set("Authorization", "Bearer invalid-token-string")

	Auth()(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuth_BearerOnly(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/test", nil)
	c.Request.Header.Set("Authorization", "Token abc123")

	Auth()(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for non-Bearer scheme, got %d", w.Code)
	}
}

func TestCORS_AllowAll(t *testing.T) {
	os.Unsetenv("CORS_ALLOWED_ORIGINS")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/test", nil)
	c.Request.Header.Set("Origin", "https://any-origin.com")

	CORS()(c)

	if w.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Errorf("expected *, got %s", w.Header().Get("Access-Control-Allow-Origin"))
	}
}

func TestCORS_SpecificOrigin_Allowed(t *testing.T) {
	os.Setenv("CORS_ALLOWED_ORIGINS", "https://app.example.com,https://admin.example.com")
	defer os.Unsetenv("CORS_ALLOWED_ORIGINS")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/test", nil)
	c.Request.Header.Set("Origin", "https://app.example.com")

	CORS()(c)

	if w.Header().Get("Access-Control-Allow-Origin") != "https://app.example.com" {
		t.Errorf("expected origin echo, got %s", w.Header().Get("Access-Control-Allow-Origin"))
	}
}

func TestCORS_SpecificOrigin_Rejected(t *testing.T) {
	os.Setenv("CORS_ALLOWED_ORIGINS", "https://app.example.com")
	defer os.Unsetenv("CORS_ALLOWED_ORIGINS")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/test", nil)
	c.Request.Header.Set("Origin", "https://evil.com")

	CORS()(c)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

func TestCORS_Preflight(t *testing.T) {
	os.Unsetenv("CORS_ALLOWED_ORIGINS")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("OPTIONS", "/test", nil)
	c.Request.Header.Set("Origin", "https://any.com")

	CORS()(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for preflight, got %d", w.Code)
	}
}
