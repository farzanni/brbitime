import { type EventItem } from "@/lib/shop";
import { Clock, Calendar, Sparkles, ChevronLeft } from "lucide-react";

export default function EventsSection({ events }: { events: EventItem[] }) {
  return (
    <aside className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide text-white uppercase">
              گاه‌شمار و رویدادها
            </h2>
            <p className="text-[10px] text-neutral-400">برنامه‌ها و تخفیف‌های پیش‌رو</p>
          </div>
        </div>
        <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] text-neutral-300">
          TIMELINE
        </span>
      </div>

      {/* Vertical Timeline */}
      <div className="relative pr-3">
        {/* Continuous Connecting Line */}
        <div
          aria-hidden="true"
          className="absolute right-[19px] top-3 bottom-4 w-px bg-gradient-to-b from-white/40 via-white/20 to-white/5"
        />

        <div className="space-y-6">
          {events.map((event, index) => (
            <div
              key={event.id}
              className="group relative flex items-start gap-4 transition"
            >
              {/* Bullet Node */}
              <div className="relative z-10 flex shrink-0 items-center justify-center">
                <div className="flex h-[15px] w-[15px] items-center justify-center rounded-full border border-white/90 bg-[#070707] ring-4 ring-white/10 transition-all duration-300 group-hover:scale-125 group-hover:border-white group-hover:ring-white/30 group-hover:shadow-[0_0_12px_rgba(255,255,255,0.6)]">
                  <div className="h-1.5 w-1.5 rounded-full bg-white transition group-hover:scale-110" />
                </div>
              </div>

              {/* Event Content Card with Sharp Cut Stone Look */}
              <div className="flex-1 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-black/60 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all duration-300 group-hover:-translate-x-1 group-hover:border-white/25 group-hover:from-white/[0.08]">
                {/* Meta row: tag + date */}
                <div className="mb-2 flex items-center justify-between gap-2">
                  {event.tag && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-neutral-200">
                      <Sparkles className="h-2.5 w-2.5 text-white" />
                      {event.tag}
                    </span>
                  )}
                  <div className="flex items-center gap-1 font-mono text-[11px] text-neutral-400">
                    <Calendar className="h-3 w-3 text-neutral-500" />
                    <span>{event.date}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xs font-bold text-white transition group-hover:text-white">
                  {event.title}
                </h3>

                {/* Description */}
                <p className="mt-1.5 text-[11px] leading-5 text-neutral-400">
                  {event.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
