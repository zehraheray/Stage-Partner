import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AnalyticsPage from "@/app/(analytics)/analytics/page";

const mockAnalytics = {
  summary: {
    total_prompts: 42,
    avg_latency_ms: 350.5,
    avg_score: 4.2,
    scored_prompts: 30,
  },
  top_logs: [
    {
      id: 1,
      prompt: "Bir kral sahneye çıkar",
      response: "Kral tahtından kalkar ve...",
      latency_ms: 280,
      score: 5,
    },
    {
      id: 2,
      prompt: "Aşk sahnesi başlar",
      response: "Yıldızlar altında iki figure...",
      latency_ms: 310,
      score: 4,
    },
  ],
};

describe("AnalyticsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise(() => {}))
    );
    render(<AnalyticsPage />);
    expect(
      screen.getByText("Sistem Analitik Verileri Yükleniyor...")
    ).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("renders metric cards after data loads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAnalytics),
      })
    );

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    expect(screen.getByText("Toplam Prompt Sayısı")).toBeInTheDocument();
    expect(screen.getByText("Ortalama Latency")).toBeInTheDocument();
    expect(screen.getByText("Ortalama Karar Skoru")).toBeInTheDocument();
    expect(screen.getByText("Puanlanmış Çıktılar")).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("renders leaderboard entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAnalytics),
      })
    );

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Bir kral sahneye çıkar/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Aşk sahnesi başlar/)).toBeInTheDocument();
    expect(screen.getByText("ID #1")).toBeInTheDocument();
    expect(screen.getByText("ID #2")).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("shows empty state when no top logs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            summary: {
              total_prompts: 0,
              avg_latency_ms: 0,
              avg_score: 0,
              scored_prompts: 0,
            },
            top_logs: [],
          }),
      })
    );

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Henüz skorlanmış kayıt bulunmuyor.")
      ).toBeInTheDocument();
    });
    vi.restoreAllMocks();
  });

  it("renders refresh button", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAnalytics),
      })
    );

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("Tabloyu Yenile")).toBeInTheDocument();
    });
    vi.restoreAllMocks();
  });
});
