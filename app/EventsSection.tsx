import { type EventItem } from "@/lib/shop";
import { Tag, Clock, ArrowLeft } from "lucide-react";

export default function EventsSection({ events }: { events: EventItem[] }) {
  if (!events || events.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <Tag className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">تخفیف‌ها و رویدادهای ویژه</h2>
            <p className="text-xs text-neutral-400">پیشنهادهای فصلی و جشنواره‌های ویژه سالن مو کات</p>
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-4 sm:p-5 backdrop-blur-xl transition hover:border-white/25 hover:shadow-[0_8px_30px_rgba(255,255,255,0.03)]"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                {event.tag && (
                  <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                    {event.tag}
                  </span>
                )}
                <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-medium">
                  <Clock className="h-3 w-3 text-neutral-400" />
                  <span>{event.date}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-amber-200 transition">
                  {event.title}
                </h3>
                {event.description && (
                  <p className="mt-1.5 text-xs text-neutral-400 leading-relaxed line-clamp-3">
                    {event.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <a
                href="#booking"
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-300 group-hover:text-white transition"
              >
                <span>رزرو با این تخفیف</span>
                <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
