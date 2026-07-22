package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"stagepartner/backend/testutil"
)

func TestGetProfile_Success(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	user := testutil.SeedUser(t, "profile@example.com", "pass123", "Profile User")
	token := testutil.MakeToken(t, user.ID, user.Email)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/user/profile", nil)
	c.Request.Header.Set("Authorization", "Bearer "+token)
	c.Set("userID", user.ID)

	GetProfile(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	u := resp["user"].(map[string]interface{})
	if u["email"] != "profile@example.com" {
		t.Errorf("expected email profile@example.com, got %v", u["email"])
	}
}

func TestGetProfile_NotFound(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/user/profile", nil)
	c.Set("userID", uint(9999))

	GetProfile(c)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestGetProfile_NoUserID(t *testing.T) {
	cleanup := testutil.SetupTestEnv(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/user/profile", nil)

	GetProfile(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}
