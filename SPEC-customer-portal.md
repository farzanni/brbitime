# Spec: Customer Portal (صفحه نوبت‌های من و لغو سریع نوبت)

## Approved Decisions
1. **Zero-Friction Access**: No SMS OTP friction required. Customer is identified instantly via their device storage (`localStorage` phone/profile) or direct phone lookup.
2. **Instant Cancellation**: One-click cancellation with a native confirmation modal. No SMS OTP code needed.
3. **No Cutoff Limit**: Customer can cancel their appointment anytime up until the appointment time.
4. **Database & Availability**: Cancelling an appointment sets `status = 'cancelled'` in Neon DB and immediately reopens that slot in `/api/availability`.

---

## 1. Objective
Enable customers of Muu Cut (`مو کات`) to:
- Access a dedicated mobile-first portal at `/my` to view active and past appointments.
- Review details: service name, Persian date (Shamsi), time slot, barber address, and booking status.
- Cancel any upcoming appointment with 1 click + confirmation dialog (zero friction).
- View their registered profile details (Name, Phone, Birthday discount perk eligibility).
- Seamlessly re-book a new appointment directly from the portal.
- Top-bar and landing shortcuts ("نوبت‌های من") in `GlassyHeader` and `HeroSection`.

---

## 2. Tech Stack
- **Framework**: Next.js 16.3.1 (App Router), React 19.2.8
- **Database**: Neon PostgreSQL (`@neondatabase/serverless`)
- **Styling**: Tailwind CSS v4, Lucide React icons
- **Deployment**: Vercel Serverless (`fra1` region co-located with Neon `eu-central-1`)

---

## 3. Commands
- **Dev**: `bun dev` (runs on `http://localhost:3000`)
- **Build**: `bun run build` (Next.js Turbopack production build)
- **Lint**: `bun run lint` (ESLint 9)
- **Performance Guard**: `node scripts/perf-guard.mjs` (must pass 8/8 assertions)

---

## 4. Architecture & Data Flow
```text
Customer Device (localStorage phone)
       │
       ▼
GET /my?phone=09... (or client-side hydrated query)
       │
       ▼
Neon DB: SELECT * FROM appointments WHERE phone = $1 ORDER BY appointment_date DESC, appointment_time DESC
       │
       ▼
Interactive UI (/my):
  ├── Tab 1: نوبت‌های فعال (Upcoming booked slots with [لغو نوبت] button)
  ├── Tab 2: تاریخچه نوبت‌ها (Past / cancelled bookings)
  └── Tab 3: مشخصات و تخفیف تولد (Customer profile, birthday perk badge)

Cancel Action:
  [لغو نوبت] ──> Confirmation Dialog ──> POST Server Action cancelMyBooking(publicId, phone)
  ──> UPDATE appointments SET status = 'cancelled'
  ──> Neon DB slot freed for /api/availability
  ──> Telegram notification sent to barber ("نوبت توسط مشتری لغو شد")
  ──> Toast notification + list updated
```

---

## 5. Boundaries
- **Always do**:
  - Verify `phone` matches appointment before cancelling (or match `public_id` UUID).
  - Alert the barber via Telegram when a customer cancels.
  - Keep the homepage prerendered (`revalidate = 600`).
  - Keep styling consistent with dark obsidian marble luxury aesthetic.
- **Never do**:
  - Expose other customers' phone numbers or names.
  - Break `perf:guard` 8/8 assertions.
