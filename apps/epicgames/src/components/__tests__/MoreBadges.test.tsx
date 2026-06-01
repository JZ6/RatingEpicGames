import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserScoreBadge, EpicDateBadge, EpicRatingBadge, PlatformBadge } from "../Badge";
import type { EpicInfo, MetacriticInfo } from "../../types";

// ──────────────────────── UserScoreBadge ────────────────────────

describe("UserScoreBadge", () => {
  it("shows dash when no info", () => {
    render(<UserScoreBadge />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows dash when user_score undefined", () => {
    render(<UserScoreBadge info={{ score: 85 }} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows formatted score", () => {
    render(<UserScoreBadge info={{ user_score: 8.5 }} />);
    expect(screen.getByText("8.5")).toBeInTheDocument();
  });

  it("applies mc-good class for >= 7.5", () => {
    render(<UserScoreBadge info={{ user_score: 8.0 }} />);
    expect(screen.getByText("8.0").classList.contains("mc-good")).toBe(true);
  });

  it("applies mc-mixed class for >= 5", () => {
    render(<UserScoreBadge info={{ user_score: 6.0 }} />);
    expect(screen.getByText("6.0").classList.contains("mc-mixed")).toBe(true);
  });

  it("applies mc-bad class for < 5", () => {
    render(<UserScoreBadge info={{ user_score: 3.2 }} />);
    expect(screen.getByText("3.2").classList.contains("mc-bad")).toBe(true);
  });
});

// ──────────────────────── EpicRatingBadge ────────────────────────

describe("EpicRatingBadge", () => {
  it("shows dash when no info", () => {
    render(<EpicRatingBadge />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows dash when no epic_rating", () => {
    render(<EpicRatingBadge info={{ slug: "x", free_dates: [] }} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows formatted rating", () => {
    render(<EpicRatingBadge info={{ slug: "x", free_dates: [], epic_rating: 4.7 }} />);
    expect(screen.getByText("4.7")).toBeInTheDocument();
  });

  it("applies er-great class for >= 4.5", () => {
    render(<EpicRatingBadge info={{ slug: "x", free_dates: [], epic_rating: 4.8 }} />);
    expect(screen.getByText("4.8").classList.contains("er-great")).toBe(true);
  });

  it("applies er-good class for >= 3.5", () => {
    render(<EpicRatingBadge info={{ slug: "x", free_dates: [], epic_rating: 3.8 }} />);
    expect(screen.getByText("3.8").classList.contains("er-good")).toBe(true);
  });

  it("applies er-mixed class for >= 2.5", () => {
    render(<EpicRatingBadge info={{ slug: "x", free_dates: [], epic_rating: 2.8 }} />);
    expect(screen.getByText("2.8").classList.contains("er-mixed")).toBe(true);
  });

  it("applies er-bad class for < 2.5", () => {
    render(<EpicRatingBadge info={{ slug: "x", free_dates: [], epic_rating: 2.1 }} />);
    expect(screen.getByText("2.1").classList.contains("er-bad")).toBe(true);
  });

  it("shows 0.0 when epic_rating is 0", () => {
    render(<EpicRatingBadge info={{ slug: "x", free_dates: [], epic_rating: 0 }} />);
    expect(screen.getByText("0.0")).toBeInTheDocument();
    expect(screen.getByText("0.0").classList.contains("er-bad")).toBe(true);
  });
});

// ──────────────────────── EpicDateBadge ────────────────────────

describe("EpicDateBadge", () => {
  it("shows dash when no info", () => {
    render(<EpicDateBadge />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows dash when no free dates", () => {
    render(<EpicDateBadge info={{ slug: "x", free_dates: [] }} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows formatted date", () => {
    render(<EpicDateBadge info={{ slug: "x", free_dates: [{ start: "2023-06-15", end: "2023-06-22" }] }} />);
    expect(screen.getByText(/2023/)).toBeInTheDocument();
    expect(screen.getByText(/Jun/)).toBeInTheDocument();
  });

  it("shows repeat count for multiple free dates", () => {
    render(<EpicDateBadge info={{
      slug: "x",
      free_dates: [
        { start: "2021-01-01", end: "2021-01-08" },
        { start: "2023-06-01", end: "2023-06-08" },
      ],
    }} />);
    expect(screen.getByText("×2")).toBeInTheDocument();
  });

  it("does not show count for single date", () => {
    render(<EpicDateBadge info={{ slug: "x", free_dates: [{ start: "2023-06-15", end: "2023-06-22" }] }} />);
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
  });
});

// ──────────────────────── PlatformBadge ────────────────────────

describe("PlatformBadge", () => {
  it("defaults to PC when no info", () => {
    render(<PlatformBadge />);
    expect(screen.getByText("PC")).toBeInTheDocument();
  });

  it("shows PC for pc platform", () => {
    render(<PlatformBadge info={{ slug: "x", free_dates: [], platforms: ["pc"] }} />);
    expect(screen.getByText("PC")).toBeInTheDocument();
  });

  it("shows iOS for ios platform", () => {
    render(<PlatformBadge info={{ slug: "x", free_dates: [], platforms: ["ios"] }} />);
    expect(screen.getByText("iOS")).toBeInTheDocument();
  });

  it("shows multiple platforms", () => {
    render(<PlatformBadge info={{ slug: "x", free_dates: [], platforms: ["pc", "ios", "android"] }} />);
    expect(screen.getByText("PC")).toBeInTheDocument();
    expect(screen.getByText("iOS")).toBeInTheDocument();
    expect(screen.getByText("Android")).toBeInTheDocument();
  });
});
