import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "@/app/(auth)/register/page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
  });

  it("renders all form fields and submit button", () => {
    render(<RegisterPage />);
    expect(screen.getByText("Ad Soyad")).toBeInTheDocument();
    expect(screen.getByText("E-posta")).toBeInTheDocument();
    expect(screen.getByText("Şifre")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /kayıt ol/i })).toBeInTheDocument();
  });

  it("renders link to login page", () => {
    render(<RegisterPage />);
    const links = screen.getAllByRole("link", { name: /giriş yap/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute("href", "/login");
  });

  it("submits register form with full_name mapping", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: "reg-jwt" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { container } = render(<RegisterPage />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Test User" } });
    fireEvent.change(inputs[1], { target: { value: "new@example.com" } });
    const passwordInput = container.querySelector('input[type="password"]');
    fireEvent.change(passwordInput!, { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /kayıt ol/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/register"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "new@example.com",
            password: "secret123",
            full_name: "Test User",
          }),
        })
      );
    });
    expect(mockPush).toHaveBeenCalledWith("/");
    expect(localStorage.getItem("stage_token")).toBe("reg-jwt");
    vi.restoreAllMocks();
  });

  it("displays error message on failed registration", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({ error: "Bu e-posta adresi zaten kullanımda" }),
      })
    );

    const { container } = render(<RegisterPage />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Dup User" } });
    fireEvent.change(inputs[1], { target: { value: "dup@example.com" } });
    const passwordInput = container.querySelector('input[type="password"]');
    fireEvent.change(passwordInput!, { target: { value: "pass123" } });
    fireEvent.click(screen.getByRole("button", { name: /kayıt ol/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Bu e-posta adresi zaten kullanımda")
      ).toBeInTheDocument();
    });
    vi.restoreAllMocks();
  });
});
