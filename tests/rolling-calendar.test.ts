import { describe, it, expect } from "bun:test";
import { getRollingDays, iranToday } from "@/lib/booking";

describe("getRollingDays", () => {
  it("returns exactly 7 days for current week (offset 0)", () => {
    const days = getRollingDays(0, "2026-11-10");
    expect(days).toHaveLength(7);
    expect(days[0].isoDate).toBe("2026-11-10");
    expect(days[0].isToday).toBe(true);
    expect(days[0].isTomorrow).toBe(false);
    expect(days[1].isoDate).toBe("2026-11-11");
    expect(days[1].isTomorrow).toBe(true);
    expect(days[6].isoDate).toBe("2026-11-16");
  });

  it("shifts window by 7 days for next week (offset 1)", () => {
    const days = getRollingDays(1, "2026-11-10");
    expect(days).toHaveLength(7);
    expect(days[0].isoDate).toBe("2026-11-17");
    expect(days[0].isToday).toBe(false);
    expect(days[6].isoDate).toBe("2026-11-23");
  });

  it("formats Persian weekdays and day-month correctly without throwing", () => {
    const days = getRollingDays(0, "2026-11-10");
    for (const day of days) {
      expect(day.weekday.length).toBeGreaterThan(0);
      expect(day.dayMonth.length).toBeGreaterThan(0);
      expect(day.fullPersian.length).toBeGreaterThan(0);
      expect(day.isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("handles month boundary correctly without date drift", () => {
    const days = getRollingDays(0, "2026-11-28");
    expect(days).toHaveLength(7);
    expect(days[0].isoDate).toBe("2026-11-28");
    expect(days[1].isoDate).toBe("2026-11-29");
    expect(days[2].isoDate).toBe("2026-11-30");
    expect(days[3].isoDate).toBe("2026-12-01");
    expect(days[4].isoDate).toBe("2026-12-02");
  });
});
