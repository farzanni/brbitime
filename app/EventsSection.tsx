import { type EventItem } from "@/lib/shop";
import { CalendarDays, Flame, Bell, Star } from "lucide-react";

export default function EventsSection({ events }: { events: EventItem[] }) {
  return (
    <aside className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">رویدادها و تخفیف‌ها</h2>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
          <Flame className="h-3 w-3" />
          ویژه
        </span>
      </div>

      <p className="text-xs leading-5 text-neutral-400">
        جدیدترین اطلاعیه‌ها، طرح‌های تخفیف فصلی و روزهای تعطیل سالن.
      </p>

      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="group relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-4 transition hover:border-amber-500/40 hover:bg-neutral-900"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                <Star className="h-3 w-3" />
                {event.tag}
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">
                {event.date}
              </span>
            </div>

            <h3 className="font-semibold text-white group-hover:text-amber-300 transition text-sm">
              {event.title}
            </h3>

            <p className="mt-1 text-xs leading-5 text-neutral-400">
              {event.description}
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
}
