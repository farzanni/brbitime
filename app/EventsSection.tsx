import { type EventItem } from "@/lib/shop";
import { Clock } from "lucide-react";

export default function EventsSection({ events }: { events: EventItem[] }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <Clock className="h-4 w-4 text-neutral-300" />
        <h2 className="text-sm font-bold text-white">تخفیف‌ها و رویدادها</h2>
      </div>

      {/* Clean list */}
      <div className="space-y-2">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20"
          >
            <div>
              <h3 className="text-xs font-bold text-white">{event.title}</h3>
              <span className="text-[10px] text-neutral-400">{event.date}</span>
            </div>
            {event.tag && (
              <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-neutral-300">
                {event.tag}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
