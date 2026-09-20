import { describe, it, expect } from "vitest";
import { formatTimeLeft } from "./format";

describe("formatTimeLeft", () => {
  it("formats 0 minutes correctly", () => {
    const now = new Date("2024-01-01T12:00:00Z");
    const due = new Date("2024-01-01T12:00:00Z"); // 0m diff
    expect(formatTimeLeft(due.toISOString(), now)).toBe("Due in 0m");
  });

  it("formats 59m correctly", () => {
    const now = new Date("2024-01-01T12:00:00Z");
    const due = new Date("2024-01-01T12:59:00Z"); // 59m diff
    expect(formatTimeLeft(due.toISOString(), now)).toBe("Due in 59m");
  });

  it("formats 1h correctly", () => {
    const now = new Date("2024-01-01T12:00:00Z");
    const due = new Date("2024-01-01T13:00:00Z"); // 1h diff
    expect(formatTimeLeft(due.toISOString(), now)).toBe("Due in 1h 0m");
  });

  it("formats 47h 59m correctly", () => {
    const now = new Date("2024-01-01T12:00:00Z");
    const due = new Date("2024-01-03T11:59:00Z"); // 47h 59m diff
    expect(formatTimeLeft(due.toISOString(), now)).toBe("Due in 47h 59m");
  });

  it("formats 48h correctly", () => {
    const now = new Date("2024-01-01T12:00:00Z");
    const due = new Date("2024-01-03T12:00:00Z"); // 48h diff
    expect(formatTimeLeft(due.toISOString(), now)).toBe("Due in 2d 0h");
  });

  it("formats negative input (overdue) correctly", () => {
    const now = new Date("2024-01-01T12:00:00Z");
    const due = new Date("2024-01-01T11:00:00Z"); // -1h diff
    expect(formatTimeLeft(due.toISOString(), now)).toBe("1h 0m overdue");
  });
  
  it("formats closed status correctly", () => {
    const now = new Date("2024-01-01T12:00:00Z");
    const due = new Date("2024-01-01T11:00:00Z"); // -1h diff
    expect(formatTimeLeft(due.toISOString(), now, "Closed")).toBe("Resolved");
  });
});
