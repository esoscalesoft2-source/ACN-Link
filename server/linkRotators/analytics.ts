import type { LinkRotatorClickEvent, LinkRotatorRecord } from "./types";

export type PeriodCounts = {
  total: number;
  today: number;
  week: number;
  month: number;
};

export type DestinationAnalytics = {
  id: string;
  url: string;
  probability: number;
  clicks: PeriodCounts;
  /** Share of all recorded clicks (0–100). */
  clickSharePercent: number;
};

const MS_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function inRange(at: string, sinceMs: number) {
  const t = new Date(at).getTime();
  return Number.isFinite(t) && t >= sinceMs;
}

function countEvents(events: LinkRotatorClickEvent[], predicate?: (e: LinkRotatorClickEvent) => boolean) {
  if (!predicate) return events.length;
  return events.filter(predicate).length;
}

export function buildRotatorAnalytics(record: LinkRotatorRecord): {
  summary: PeriodCounts;
  destinations: DestinationAnalytics[];
} {
  const events = Array.isArray(record.clickEvents) ? record.clickEvents : [];
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const weekStart = now.getTime() - 7 * MS_DAY;
  const monthStart = now.getTime() - 30 * MS_DAY;

  const summary: PeriodCounts = {
    total: record.totalClicks || events.length,
    today: countEvents(events, (e) => inRange(e.at, todayStart)),
    week: countEvents(events, (e) => inRange(e.at, weekStart)),
    month: countEvents(events, (e) => inRange(e.at, monthStart))
  };

  const destinations: DestinationAnalytics[] = record.destinations.map((destination) => {
    const destEvents = events.filter(
      (event) =>
        (event.destinationId && event.destinationId === destination.id) ||
        (event.url && event.url === destination.url)
    );
    const stored = Number(destination.clicks) || 0;
    const total = Math.max(stored, destEvents.length);
    const clicks: PeriodCounts = {
      total,
      today: countEvents(destEvents, (e) => inRange(e.at, todayStart)),
      week: countEvents(destEvents, (e) => inRange(e.at, weekStart)),
      month: countEvents(destEvents, (e) => inRange(e.at, monthStart))
    };
    const clickSharePercent =
      summary.total > 0 ? Math.round((clicks.total / summary.total) * 1000) / 10 : 0;

    return {
      id: destination.id,
      url: destination.url,
      probability: destination.probability,
      clicks,
      clickSharePercent
    };
  });

  return { summary, destinations };
}
