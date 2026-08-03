"use client";

import { Calendar, Clock, MessageCircleQuestion, Play, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LiveSessionItem } from "@/lib/live-api";
import { formatDateFull, formatTime } from "@/lib/live-format";
import type { ReactNode } from "react";

interface EventCardProps {
  session: LiveSessionItem;
  onJoin?: (session: LiveSessionItem) => void;
  onQuestions?: (session: LiveSessionItem) => void;
}

/** Free live events presented as events (banner, title, meta, join), not bookings. */
export function EventCard({ session, onJoin, onQuestions }: EventCardProps): ReactNode {
  const seatsLeft = session.maxStudents > 0 ? session.maxStudents - session._count.bookings : null;

  return (
    <article className="group overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/80 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-[var(--ui-card-bg-dark)]">
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_70%,white,transparent_40%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent" />
        <Badge className="absolute right-4 top-4 bg-black/30 text-white backdrop-blur-sm">
          <Play className="h-3 w-3" />
          حدث مجاني
        </Badge>
      </div>

      <div className="flex flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
            {session.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">
            {session.description ?? "انضم إلى جلسة مباشرة مجانية مع معلمك."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary-500" />
            {formatDateFull(session.startTime)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary-500" />
            {formatTime(session.startTime)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-primary-500" />
            {session.teacher.fullName}
          </span>
          {seatsLeft !== null && (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-500">●</span>
              {seatsLeft > 0 ? `${String(seatsLeft)} مقعد` : "ممتلئة"}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2">
          <Button
            size="md"
            className="flex-1 rounded-2xl"
            onClick={() => { onJoin?.(session); }}
            disabled={!session.meetingUrl}
          >
            <Play className="h-4 w-4" />
            انضم الآن
          </Button>
          {onQuestions && (
            <Button
              variant="outline"
              size="md"
              className="rounded-2xl"
              onClick={() => { onQuestions(session); }}
            >
              <MessageCircleQuestion className="h-4 w-4" />
              اطرح سؤالاً
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
