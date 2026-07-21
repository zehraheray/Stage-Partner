// Basit localStorage tabanlı auth yardımcıları.
// Tüm login/register/logout ve API çağrıları AYNI token anahtarını kullanmalı.

export const TOKEN_KEY = "stage_token";

export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Backend'e "logout oldum" bilgisini iletir (best-effort, hata olsa da devam eder).
export async function logout() {
  const token = getToken();
  try {
    await fetch(`${getApiUrl()}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    // Backend'e ulaşılamasa bile client tarafında çıkışı tamamlıyoruz.
  } finally {
    clearToken();
  }
}
