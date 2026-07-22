package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"stagepartner/backend/config"
	"stagepartner/backend/models"
	"stagepartner/backend/routes"
)

func setupTestServer(t *testing.T) *httptest.Server {
	t.Helper()

	os.Setenv("JWT_SECRET", "integration-test-secret")
	config.InitJWT()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal("failed to open test database:", err)
	}
	db.AutoMigrate(&models.User{}, &models.LlmLog{})
	config.DB = db

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(gin.Recovery())
	routes.Setup(r)

	t.Cleanup(func() {
		config.DB = nil
		os.Unsetenv("JWT_SECRET")
	})

	return httptest.NewServer(r)
}

func seedUser(t *testing.T, email, password string) {
	t.Helper()
	hashed, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	config.DB.Create(&models.User{Email: email, Password: string(hashed), FullName: "Test"})
}

func seedLog(t *testing.T, prompt, response string, score int) models.LlmLog {
	t.Helper()
	log := models.LlmLog{Prompt: prompt, Response: response, LatencyMs: 100, Score: score}
	config.DB.Create(&log)
	return log
}

func doRequest(t *testing.T, method, url, body string, headers map[string]string) *http.Response {
	t.Helper()
	var reqBody *bytes.Buffer
	if body != "" {
		reqBody = bytes.NewBufferString(body)
	} else {
		reqBody = bytes.NewBuffer(nil)
	}
	req, _ := http.NewRequest(method, url, reqBody)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	if body != "" && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal("request failed:", err)
	}
	return resp
}

func parseJSON(t *testing.T, resp *http.Response) map[string]interface{} {
	t.Helper()
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	resp.Body.Close()
	return result
}

func TestIntegration_Health(t *testing.T) {
	srv := setupTestServer(t)
	defer srv.Close()

	resp := doRequest(t, "GET", srv.URL+"/health", "", nil)
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestIntegration_RegisterAndLogin(t *testing.T) {
	srv := setupTestServer(t)
	defer srv.Close()

	// Register
	resp := doRequest(t, "POST", srv.URL+"/auth/register",
		`{"email":"int@test.com","password":"pass123","full_name":"Int User"}`, nil)
	if resp.StatusCode != 200 {
		t.Fatalf("register: expected 200, got %d", resp.StatusCode)
	}
	reg := parseJSON(t, resp)
	if reg["token"] == nil || reg["token"] == "" {
		t.Fatal("register: expected token")
	}

	// Login
	resp = doRequest(t, "POST", srv.URL+"/auth/login",
		`{"email":"int@test.com","password":"pass123"}`, nil)
	if resp.StatusCode != 200 {
		t.Fatalf("login: expected 200, got %d", resp.StatusCode)
	}
	login := parseJSON(t, resp)
	token := login["token"].(string)
	if token == "" {
		t.Fatal("login: expected token")
	}

	// Access protected profile with token
	headers := map[string]string{"Authorization": "Bearer " + token}
	resp = doRequest(t, "GET", srv.URL+"/user/profile", "", headers)
	if resp.StatusCode != 200 {
		t.Fatalf("profile: expected 200, got %d", resp.StatusCode)
	}
	profile := parseJSON(t, resp)
	user := profile["user"].(map[string]interface{})
	if user["email"] != "int@test.com" {
		t.Fatalf("profile: expected email int@test.com, got %v", user["email"])
	}
}

func TestIntegration_Login_WrongPassword(t *testing.T) {
	srv := setupTestServer(t)
	defer srv.Close()

	seedUser(t, "wrong@test.com", "correct")

	resp := doRequest(t, "POST", srv.URL+"/auth/login",
		`{"email":"wrong@test.com","password":"incorrect"}`, nil)
	if resp.StatusCode != 401 {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
}

func TestIntegration_Register_Duplicate(t *testing.T) {
	srv := setupTestServer(t)
	defer srv.Close()

	seedUser(t, "dup@test.com", "pass123")

	resp := doRequest(t, "POST", srv.URL+"/auth/register",
		`{"email":"dup@test.com","password":"pass123"}`, nil)
	if resp.StatusCode != 400 {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}

func TestIntegration_LLMFlow(t *testing.T) {
	srv := setupTestServer(t)
	defer srv.Close()

	seedUser(t, "llm@test.com", "pass123")

	// Login
	resp := doRequest(t, "POST", srv.URL+"/auth/login",
		`{"email":"llm@test.com","password":"pass123"}`, nil)
	login := parseJSON(t, resp)
	token := login["token"].(string)
	headers := map[string]string{
		"Authorization": "Bearer " + token,
		"Content-Type":  "application/json",
	}

	// Create log
	resp = doRequest(t, "POST", srv.URL+"/llm/log/raw-output",
		`{"prompt":"Hello","response":"World","latency_ms":50,"score":0}`, headers)
	if resp.StatusCode != 200 {
		t.Fatalf("create log: expected 200, got %d", resp.StatusCode)
	}
	created := parseJSON(t, resp)
	data := created["data"].(map[string]interface{})
	logID := data["id"].(float64)

	// Get logs
	resp = doRequest(t, "GET", srv.URL+"/llm/logs", "", headers)
	if resp.StatusCode != 200 {
		t.Fatalf("get logs: expected 200, got %d", resp.StatusCode)
	}
	logs := parseJSON(t, resp)
	logList := logs["data"].([]interface{})
	if len(logList) != 1 {
		t.Fatalf("expected 1 log, got %d", len(logList))
	}

	// Score decision
	resp = doRequest(t, "POST", srv.URL+"/llm/score/decision",
		fmt.Sprintf(`{"id":%d,"score":5}`, int(logID)), headers)
	if resp.StatusCode != 200 {
		t.Fatalf("score: expected 200, got %d", resp.StatusCode)
	}

	// Analytics
	resp = doRequest(t, "GET", srv.URL+"/llm/analytics", "", headers)
	if resp.StatusCode != 200 {
		t.Fatalf("analytics: expected 200, got %d", resp.StatusCode)
	}
	analytics := parseJSON(t, resp)
	summary := analytics["summary"].(map[string]interface{})
	if summary["total_prompts"].(float64) != 1 {
		t.Fatalf("expected 1 total prompt, got %v", summary["total_prompts"])
	}

	// Delete log
	resp = doRequest(t, "DELETE", srv.URL+fmt.Sprintf("/llm/logs/%d", int(logID)), "", headers)
	if resp.StatusCode != 200 {
		t.Fatalf("delete log: expected 200, got %d", resp.StatusCode)
	}

	// Export
	resp = doRequest(t, "GET", srv.URL+"/llm/export", "", headers)
	if resp.StatusCode != 200 {
		t.Fatalf("export: expected 200, got %d", resp.StatusCode)
	}
	export := parseJSON(t, resp)
	if export["total_exported"].(float64) != 0 {
		t.Fatalf("expected 0 exported after delete, got %v", export["total_exported"])
	}
}

func TestIntegration_UnauthorizedAccess(t *testing.T) {
	srv := setupTestServer(t)
	defer srv.Close()

	endpoints := []struct {
		method string
		path   string
	}{
		{"GET", "/llm/logs"},
		{"GET", "/llm/analytics"},
		{"GET", "/llm/export"},
		{"GET", "/user/profile"},
	}

	for _, ep := range endpoints {
		resp := doRequest(t, ep.method, srv.URL+ep.path, "", nil)
		if resp.StatusCode != 401 {
			t.Errorf("%s %s: expected 401, got %d", ep.method, ep.path, resp.StatusCode)
		}
		resp.Body.Close()
	}
}

func TestIntegration_RateLimit(t *testing.T) {
	srv := setupTestServer(t)
	defer srv.Close()

	// Hit the auth rate limit (10 req/min)
	for i := 0; i < 10; i++ {
		resp := doRequest(t, "POST", srv.URL+"/auth/login",
			`{"email":"rate@test.com","password":"pass"}`, nil)
		resp.Body.Close()
	}

	// 11th request should be rate limited
	resp := doRequest(t, "POST", srv.URL+"/auth/login",
		`{"email":"rate@test.com","password":"pass"}`, nil)
	if resp.StatusCode != 429 {
		t.Fatalf("expected 429 rate limit, got %d", resp.StatusCode)
	}
	resp.Body.Close()
}
