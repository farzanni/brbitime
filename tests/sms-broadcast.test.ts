import { describe, expect, it } from "bun:test";
import {
  calculateSmsParts,
  interpolateSmsTemplate,
} from "@/lib/sms-broadcast";

describe("SMS Part Calculation", () => {
  it("calculates Persian single-part message up to 70 chars", () => {
    const text = "سلام علی عزیز، نوبت شما با موفقیت ثبت شد.";
    const result = calculateSmsParts(text);
    expect(result.isPersian).toBe(true);
    expect(result.parts).toBe(1);
    expect(result.charsRemainingInCurrentPart).toBe(70 - text.length);
  });

  it("calculates Persian multi-part message (71+ chars)", () => {
    // 75 Persian characters
    const text = "سلام دوست عزیز، به مناسبت افتتاحیه سالن مو کات تخفیف ویژه برای شما در نظر گرفته‌ایم منتظرتان هستیم.";
    const result = calculateSmsParts(text);
    expect(result.isPersian).toBe(true);
    expect(result.parts).toBe(Math.ceil(text.length / 67));
  });

  it("calculates English single-part message up to 160 chars", () => {
    const text = "Hello your appointment is booked successfully. See you soon!";
    const result = calculateSmsParts(text);
    expect(result.isPersian).toBe(false);
    expect(result.parts).toBe(1);
    expect(result.charsRemainingInCurrentPart).toBe(160 - text.length);
  });

  it("handles empty string safely", () => {
    const result = calculateSmsParts("");
    expect(result.charCount).toBe(0);
    expect(result.parts).toBe(1);
  });
});

describe("SMS Template Interpolation", () => {
  it("replaces customer name when provided", () => {
    const template = "سلام {نام} عزیز، دلتنگتیم! در {سالن} منتظرت هستیم. سایت: {سایت}";
    const output = interpolateSmsTemplate(
      template,
      { phone: "09121111111", name: "محمدرضا" },
      { shopName: "مو کات", shopUrl: "muucut.ir" }
    );
    expect(output).toBe("سلام محمدرضا عزیز، دلتنگتیم! در مو کات منتظرت هستیم. سایت: muucut.ir");
  });

  it("falls back gracefully when customer name is empty", () => {
    const template = "سلام {نام} عزیز، به {سالن} خوش آمدید.";
    const output = interpolateSmsTemplate(
      template,
      { phone: "09121111111", name: "" },
      { shopName: "مو کات" }
    );
    expect(output).toBe("سلام و درود، به مو کات خوش آمدید.");
  });

  it("replaces date placeholder", () => {
    const template = "اطلاعیه مهم تاریخ {تاریخ} در {سالن}";
    const output = interpolateSmsTemplate(
      template,
      { phone: "09121111111", name: "رضا" },
      { shopName: "مو کات", persianDate: "۲۰ آبان" }
    );
    expect(output).toBe("اطلاعیه مهم تاریخ ۲۰ آبان در مو کات");
  });

  it("supports English placeholder tags {name}, {shop}, {url}", () => {
    const template = "Dear {name}, visit {shop} at {url}";
    const output = interpolateSmsTemplate(
      template,
      { phone: "09121111111", name: "Ali" },
      { shopName: "MuuCut", shopUrl: "muucut.ir" }
    );
    expect(output).toBe("Dear Ali, visit MuuCut at muucut.ir");
  });
});
