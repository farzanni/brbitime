# Implementation Plan: Zero-Friction Customer Portal

## Objective
Build `/my` (نوبت‌های من) allowing customers to instantly view their upcoming and past bookings, cancel any upcoming booking with 1-click confirmation (no OTP, no cutoff limit), and re-book.

## Architecture
1. **Data Access**: Query appointments by customer phone number from Neon PostgreSQL.
2. **Client State**: Read saved phone number from `localStorage` (`lib/customerCache.ts`) on mount, auto-fetch bookings, allow manual phone entry if empty.
3. **Cancellation Flow**: Server action `cancelCustomerAppointment(publicId, phone)` updates status to `cancelled`, alerts barber on Telegram, revalidates availability.
4. **UI**: Obsidian dark marble aesthetic, mobile-first responsive layout, Persian Shamsi dates.

## Implementation Slices
1. **Backend / Actions**: Phone lookup and cancellation server action with Telegram alert.
2. **Page & Client View**: `/my` route with `CustomerPortalClient.tsx`.
3. **Header & Navigation**: Add "نوبت‌های من" links in `GlassyHeader`, `HeroSection`, and `success/page.tsx`.
4. **Verification**: Lint, Turbopack build, and `perf:guard` 8/8 check.
