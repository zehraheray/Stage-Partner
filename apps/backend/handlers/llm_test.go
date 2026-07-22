package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"stagepartner/backend/config"
	"stagepartner/backend/models"
	"stagepartner/backend/testutil"
)

func setupLLMTest(t *testing.T) func() {
	t.Helper()
	return testutil.SetupTestEnv(t)
}

func TestCreateLog_Success(t *testing.T) {
	cleanup := setupLLMTest(t)
	defer cleanup()

	body, _ := json.Marshal(map[string]interface{}{
		"prompt":     "Hello AI",
		"response":   "Hello human",
		"latency_ms": 150,
		"score":      0,
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/llm/log/raw-output", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CreateLog(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	if data["prompt"] != "Hello AI" {
		t.Errorf("expected prompt 'Hello AI', got %v", data["prompt"])
	}
}

func TestCreateLog_InvalidJSON(t *testing.T) {
	cleanup := setupLLMTest(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/llm/log/raw-output", bytes.NewReader([]byte("not json")))
	c.Request.Header.Set("Content-Type", "application/json")

	CreateLog(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestGetLogs_Empty(t *testing.T) {
	cleanup := setupLLMTest(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/llm/logs", nil)

	GetLogs(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].([]interface{})
	if len(data) != 0 {
		t.Errorf("expected empty logs, got %d", len(data))
	}
}

func TestGetLogs_WithData(t *testing.T) {
	cleanup := setupLLMTest(t)
	defer cleanup()

	testutil.SeedLog(t, "p1", "r1", 100, 4)
	testutil.SeedLog(t, "p2", "r2", 200, 5)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/llm/logs", nil)

	GetLogs(c)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].([]interface{})
	if len(data) != 2 {
		t.Errorf("expected 2 logs, got %d", len(data))
	}
}

func TestGetAnalytics(t *testing.T) {
	cleanup := setupLLMTest(t)
	defer cleanup()

	testutil.SeedLog(t, "p1", "r1", 100, 4)
	testutil.SeedLog(t, "p2", "r2", 300, 5)
	testutil.SeedLog(t, "p3", "r3", 200, 0)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/llm/analytics", nil)

	GetAnalytics(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	summary := resp["summary"].(map[string]interface{})

	if summary["total_prompts"].(float64) != 3 {
		t.Errorf("expected 3 total prompts, got %v", summary["total_prompts"])
	}
	if summary["scored_prompts"].(float64) != 2 {
		t.Errorf("expected 2 scored prompts, got %v", summary["scored_prompts"])
	}
}

func TestScoreDecision_Success(t *testing.T) {
	cleanup := setupLLMTest(t)
	defer cleanup()

	log := testutil.SeedLog(t, "prompt", "response", 100, 0)

	body, _ := json.Marshal(map[string]interface{}{
		"id":    log.ID,
		"score": 5,
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/llm/score/decision", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ScoreDecision(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	if data["score"].(float64) != 5 {
		t.Errorf("expected score 5, got %v", data["score"])
	}
}

func TestScoreDecision_NotFound(t *testing.T) {
	cleanup := setupLLMTest(t)
	defer cleanup()

	body, _ := json.Marshal(map[string]interface{}{
		"id":    9999,
		"score": 3,
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/llm/score/decision", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ScoreDecision(c)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestGetLog_Success(t *testing.T) {
	cleanup := setupLLMTest(t)
	defer cleanup()

	log := testutil.SeedLog(t, "my prompt", "my response", 50, 3)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", fmt.Sprintf("/llm/logs/%d", log.ID), nil)
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprintf("%d", log.ID)}}

	GetLog(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	if data["prompt"] != "my prompt" {
		t.Errorf("expected prompt 'my prompt', got %v", data["prompt"])
	}
}

func TestGetLog_NotFound(t *testing.T) {
	cleanup := setupLLMTest(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/llm/logs/9999", nil)
	c.Params = []gin.Param{{Key: "id", Value: "9999"}}

	GetLog(c)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestClearLogs(t *testing.T) {
	cleanup := setupLLMTest(t)
	defer cleanup()

	testutil.SeedLog(t, "p1", "r1", 100, 0)
	testutil.SeedLog(t, "p2", "r2", 200, 0)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("DELETE", "/llm/logs/clear", nil)

	ClearLogs(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var count int64
	config.DB.Model(&models.LlmLog{}).Count(&count)
	if count != 0 {
		t.Errorf("expected 0 logs after clear, got %d", count)
	}
}

func TestDeleteLog_Success(t *testing.T) {
	cleanup := setupLLMTest(t)
	defer cleanup()

	log := testutil.SeedLog(t, "to delete", "response", 100, 0)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("DELETE", fmt.Sprintf("/llm/logs/%d", log.ID), nil)
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprintf("%d", log.ID)}}

	DeleteLog(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var count int64
	config.DB.Model(&models.LlmLog{}).Count(&count)
	if count != 0 {
		t.Errorf("expected 0 logs after delete, got %d", count)
	}
}

func TestExportLogs(t *testing.T) {
	cleanup := setupLLMTest(t)
	defer cleanup()

	testutil.SeedLog(t, "p1", "r1", 100, 0)
	testutil.SeedLog(t, "p2", "r2", 200, 0)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/llm/export", nil)

	ExportLogs(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["total_exported"].(float64) != 2 {
		t.Errorf("expected 2 exported, got %v", resp["total_exported"])
	}
	if resp["format"] != "json" {
		t.Errorf("expected format 'json', got %v", resp["format"])
	}
}
