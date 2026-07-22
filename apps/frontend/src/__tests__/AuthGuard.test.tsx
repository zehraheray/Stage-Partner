import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthGuard from "@/components/AuthGuard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

describe("AuthGuard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows loading state when no token", () => {
    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    );
    expect(screen.getByText("Oturum kontrol ediliyor...")).toBeInTheDocument();
  });

  it("renders children when token exists", () => {
    localStorage.setItem("stage_token", "valid-token");
    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    );
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
