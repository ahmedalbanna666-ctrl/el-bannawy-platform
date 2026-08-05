import type { AvailableSlotItem, LiveBookingItem } from "@/lib/live-api";

/** Visual tone for an available slot (green / yellow / red / gray). */
export type SlotTone = "available" | "few" | "full" | "booked" | "unavailable";

export function slotTone(slot: AvailableSlotItem): SlotTone {
  if (slot.bookedByMe) return "booked";
  if (slot.availableSeats <= 0) return "full";
  if (slot.maxStudents > 0 && slot.availableSeats <= Math.max(2, Math.ceil(slot.maxStudents * 0.2))) {
    return "few";
  }
  return "available";
}

const timeFmt = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  hour: "2-digit",
  minute: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const dateFmtFull = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const weekdayFmt = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { weekday: "long" });

export function formatTime(iso: string | Date): string {
  if (typeof iso === "string" && /^\d{2}:\d{2}$/.test(iso)) return iso;
  return timeFmt.format(new Date(iso));
}

export function formatDate(iso: string | Date): string {
  return dateFmt.format(new Date(iso));
}

export function formatDateFull(iso: string | Date): string {
  return dateFmtFull.format(new Date(iso));
}

export function weekdayName(iso: string | Date): string {
  return weekdayFmt.format(new Date(iso));
}

export interface TimelineStep {
  key: string;
  label: string;
  state: "done" | "active" | "pending";
}

/**
 * Presentation-only booking lifecycle timeline derived from existing data.
 * Maps the booking + session state onto: Selected → Confirmed → Reminder → Live → Completed.
 */
export function bookingTimeline(booking: LiveBookingItem): TimelineStep[] {
  if (booking.status === "CANCELLED") {
    return [{ key: "cancelled", label: "تم الإلغاء", state: "done" }];
  }

  const now = Date.now();
  const start = new Date(booking.session.startTime).getTime();
  const end = new Date(booking.session.endTime).getTime();
  const isLive = booking.session.status === "LIVE";
  const isCompleted = booking.session.status === "COMPLETED" || now >= end;

  let activeIndex = 1; // confirmed
  if (!isLive && start - now <= 1000 * 60 * 60 * 24 && start > now) {
    activeIndex = 2; // reminder window
  }
  if (isLive || (start <= now && now < end)) {
    activeIndex = 3; // live now
  }
  if (isCompleted) {
    activeIndex = 4; // completed
  }

  const steps: { key: string; label: string }[] = [
    { key: "selected", label: "تم الاختيار" },
    { key: "confirmed", label: "تم التأكيد" },
    { key: "reminder", label: "التذكير" },
    { key: "live", label: "مباشر الآن" },
    { key: "completed", label: "اكتملت" },
  ];

  return steps.map((step, i) => ({
    ...step,
    state: i < activeIndex ? "done" : i === activeIndex ? "active" : "pending",
  }));
}

/** Rough presentation estimate for waitlist odds, derived from the student position. */
export function waitlistChance(position: number): number {
  return Math.max(5, 100 - Math.max(0, position - 1) * 10);
}
