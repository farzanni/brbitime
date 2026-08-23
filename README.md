# brbitime — رزرو آنلاین آرایشگاه

Booking page for barbershops and salons in Iran. Customers pick a service,
a day (Persian calendar), and a time slot; the owner gets an instant
Telegram notification and manages bookings from a password-protected panel.

Built with Next.js (App Router), React 19, Tailwind CSS 4, Neon serverless
Postgres, and the Telegram Bot API. Fully RTL / Persian-first.

## Features

- Mobile-first RTL booking flow: service → Persian-calendar day → time slot → contact info
- Live availability: booked slots are disabled and double-bookings are rejected at the DB level (`UNIQUE` constraint)
- Instant Telegram alert to the owner on every new booking (non-blocking — booking succeeds even if the alert fails)
- Owner panel at `/admin` (password login, HMAC-signed session cookie): upcoming appointments, cancel, logout
- Confirmation page with the customer's own booking details

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Neon Postgres connection string |
| `ADMIN_PASSWORD` | ✅ | Owner panel password |
| `ADMIN_SESSION_SECRET` | ✅ | Any long random string (signs the session cookie) |
| `TELEGRAM_BOT_TOKEN` | optional | Bot token for booking alerts |
| `TELEGRAM_CHAT_ID` | optional | Chat that receives booking alerts |
| `TELEGRAM_TARGETS` | optional | Comma-separated `BOT_TOKEN:CHAT_ID` pairs — every target gets pinged (owner + operator). Takes priority over the single pair above. |
| `NEXT_PUBLIC_APP_URL` | optional | Public URL, used for the admin link inside alerts |

## Database schema

```sql
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- one booking per slot per day:
CREATE UNIQUE INDEX IF NOT EXISTS appointments_slot_unique
  ON appointments (appointment_date, appointment_time)
  WHERE status = 'booked';
```

## Develop

```bash
bun install
bun dev        # http://localhost:3000
bun run lint   # eslint
bun run build  # production build
```

Shop config (name, phone, Instagram) lives in `lib/shop.ts`;
services and time slots in `lib/booking.ts`.
