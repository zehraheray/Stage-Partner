import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
  });

  it("renders form inputs and submit button", () => {
    render(<LoginPage />);
    expect(screen.getByText("E-posta")).toBeInTheDocument();
    expect(screen.getByText("Şifre")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /giriş yap/i })).toBeInTheDocument();
  });

  it("renders link to register page", () => {
    render(<LoginPage />);
    const links = screen.getAllByRole("link", { name: /kayıt ol/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute("href", "/register");
  });

  it("submits login form and redirects on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: "test-jwt" }),
      })
    );

    render(<LoginPage />);
    const emailInput = screen.getAllByRole("textbox")[0];
    const passwordInput = screen.getAllByDisplayValue("")[1];
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /giriş yap/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
    expect(localStorage.getItem("stage_token")).toBe("test-jwt");
    vi.restoreAllMocks();
  });

  it("displays error message on failed login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Geçersiz e-posta veya şifre" }),
      })
    );

    render(<LoginPage />);
    const emailInput = screen.getAllByRole("textbox")[0];
    const passwordInput = screen.getAllByDisplayValue("")[1];
    fireEvent.change(emailInput, { target: { value: "wrong@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /giriş yap/i }));

    await waitFor(() => {
      expect(screen.getByText("Geçersiz e-posta veya şifre")).toBeInTheDocument();
    });
    vi.restoreAllMocks();
  });
});
