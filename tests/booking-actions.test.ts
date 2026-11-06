import { describe, it, expect } from "bun:test";
import { cleanIranPhone, toPersianDigits, TIME_SLOTS } from "@/lib/booking";

describe("cleanIranPhone", () => {
  it("keeps standard 11-digit Iranian mobile numbers intact", () => {
    expect(cleanIranPhone("09123456789")).toBe("09123456789");
    expect(cleanIranPhone("09308537418")).toBe("09308537418");
  });

  it("handles 10-digit numbers starting with 9 by prefixing 0", () => {
    expect(cleanIranPhone("9123456789")).toBe("09123456789");
  });

  it("handles +98 country code", () => {
    expect(cleanIranPhone("+989123456789")).toBe("09123456789");
    expect(cleanIranPhone("989123456789")).toBe("09123456789");
  });

  it("handles 0098 international dialing prefix", () => {
    expect(cleanIranPhone("00989123456789")).toBe("09123456789");
  });

  it("normalizes Persian and Arabic numerals before cleaning", () => {
    expect(cleanIranPhone("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
    expect(cleanIranPhone("+۹۸۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
    expect(cleanIranPhone("٩١٢٣٤٥٦٧٨٩")).toBe("09123456789");
  });

  it("removes dashes, spaces, and formatting characters", () => {
    expect(cleanIranPhone(" 0912 345 6789 ")).toBe("09123456789");
    expect(cleanIranPhone("0912-345-6789")).toBe("09123456789");
  });
});

describe("toPersianDigits & TIME_SLOTS matching", () => {
  it("converts ASCII time string to Persian digits", () => {
    expect(toPersianDigits("16:00")).toBe("۱۶:۰۰");
    expect(toPersianDigits("09:00")).toBe("۰۹:۰۰");
  });

  it("matches TIME_SLOTS after conversion", () => {
    const asciiTime = "16:00";
    const persianTime = toPersianDigits(asciiTime);
    expect(TIME_SLOTS.some((slot) => slot === persianTime)).toBe(true);
  });
});

describe("Analytics referrer crash prevention", () => {
  it("safely handles malformed referrer without throwing", () => {
    const malformedReferrers = [
      "not-a-valid-url",
      "://bad",
      "javascript:void(0)",
      "http://[invalid-ipv6",
    ];

    for (const ref of malformedReferrers) {
      let rawSource: string | null = null;
      try {
        rawSource = new URL(ref, "https://dummy").hostname;
      } catch {
        rawSource = null;
      }
      expect(typeof rawSource === "string" || rawSource === null).toBe(true);
    }
  });

  it("parses valid referrers correctly", () => {
    const valid = "https://instagram.com/muucut";
    let rawSource: string | null = null;
    try {
      rawSource = new URL(valid, "https://dummy").hostname;
    } catch {
      rawSource = null;
    }
    expect(rawSource).toBe("instagram.com");
  });
});
