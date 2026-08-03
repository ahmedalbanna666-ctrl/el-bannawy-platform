export const SESSION_INCLUDE = {
  teacher: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
  grade: { select: { id: true, name: true } },
  lesson: { select: { id: true, title: true, unitId: true } },
  _count: { select: { bookings: true } },
} as const;
