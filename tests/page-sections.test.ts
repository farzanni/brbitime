import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Homepage section ordering", () => {
  it("renders discounts first, then products, then booking section", () => {
    const pageContent = readFileSync(join(process.cwd(), "app/page.tsx"), "utf-8");

    const discountsPos = pageContent.indexOf('id="discounts"');
    const productsPos = pageContent.indexOf('id="products"');
    const bookingPos = pageContent.indexOf('id="booking"');

    expect(discountsPos).toBeGreaterThan(-1);
    expect(productsPos).toBeGreaterThan(-1);
    expect(bookingPos).toBeGreaterThan(-1);

    // discounts comes first, then products, then booking
    expect(discountsPos).toBeLessThan(productsPos);
    expect(productsPos).toBeLessThan(bookingPos);
  });

  it("contains link to /gallery in landing section", () => {
    const heroContent = readFileSync(join(process.cwd(), "app/HeroSection.tsx"), "utf-8");
    expect(heroContent).toContain('href="/gallery"');
    expect(heroContent).toContain("گالری مدل مو");
  });

  it("contains link to /gallery in header and page footer", () => {
    const headerContent = readFileSync(join(process.cwd(), "app/GlassyHeader.tsx"), "utf-8");
    expect(headerContent).toContain('href="/gallery"');

    const pageContent = readFileSync(join(process.cwd(), "app/page.tsx"), "utf-8");
    expect(pageContent).toContain('href="/gallery"');
  });
});
