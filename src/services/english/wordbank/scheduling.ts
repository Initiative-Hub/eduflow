const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export function getNextReviewDate(masteryLevel: number, now = new Date()) {
  if (masteryLevel <= 0) return now;
  return addDays(now, masteryLevel === 1 ? 3 : 7);
}

export function getLocalDayRange(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
