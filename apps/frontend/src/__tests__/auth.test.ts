import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  TOKEN_KEY,
  getApiUrl,
  getToken,
  setToken,
  clearToken,
  getAuthHeaders,
  logout,
} from "@/lib/auth";

describe("auth utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getApiUrl", () => {
    it("returns default when env not set", () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      expect(getApiUrl()).toBe("http://localhost:8080");
    });

    it("returns env value when set", () => {
      process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
      expect(getApiUrl()).toBe("https://api.example.com");
      delete process.env.NEXT_PUBLIC_API_URL;
    });
  });

  describe("getToken / setToken / clearToken", () => {
    it("returns null when no token stored", () => {
      expect(getToken()).toBeNull();
    });

    it("stores and retrieves token", () => {
      setToken("abc123");
      expect(getToken()).toBe("abc123");
      expect(localStorage.getItem(TOKEN_KEY)).toBe("abc123");
    });

    it("removes token on clear", () => {
      setToken("abc123");
      clearToken();
      expect(getToken()).toBeNull();
    });
  });

  describe("getAuthHeaders", () => {
    it("returns content-type without auth when no token", () => {
      const headers = getAuthHeaders();
      expect(headers).toEqual({ "Content-Type": "application/json" });
    });

    it("includes Authorization header when token exists", () => {
      setToken("mytoken");
      const headers = getAuthHeaders();
      expect(headers).toEqual({
        "Content-Type": "application/json",
        Authorization: "Bearer mytoken",
      });
    });
  });

  describe("logout", () => {
    it("clears token even if fetch fails", async () => {
      setToken("mytoken");
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
      await logout();
      expect(getToken()).toBeNull();
      vi.restoreAllMocks();
    });

    it("calls /auth/logout endpoint", async () => {
      setToken("mytoken");
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", mockFetch);
      await logout();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/logout"),
        expect.objectContaining({ method: "POST" })
      );
      expect(getToken()).toBeNull();
      vi.restoreAllMocks();
    });
  });
});
