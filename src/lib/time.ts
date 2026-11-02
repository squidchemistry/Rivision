// Calendar days and months are counted in the app's timezone, not the server's,
// so streaks and monthly limits roll over at the user's midnight.
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

const dayFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

/** "YYYY-MM-DD" for the given instant in APP_TIMEZONE */
export function dayKey(date: Date): string {
    return dayFormat.format(date);
}

/** "YYYY-MM" for the given instant in APP_TIMEZONE */
export function monthKey(date: Date): string {
    return dayKey(date).slice(0, 7);
}

/** Whole calendar days between two day keys (b - a) */
export function daysBetween(a: string, b: string): number {
    const toUtc = (key: string) => {
        const [y, m, d] = key.split('-').map(Number);
        return Date.UTC(y, m - 1, d);
    };
    return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** The instant today's calendar day started in APP_TIMEZONE */
export function startOfToday(now = new Date()): Date {
    // Step back hour by hour until the day key changes; at most 24 steps, no tz database needed
    const today = dayKey(now);
    let t = new Date(now);
    t.setUTCMinutes(0, 0, 0);
    while (dayKey(new Date(t.getTime() - 1)) === today) t = new Date(t.getTime() - 3_600_000);
    // Refine to the minute for timezones with :30 / :45 offsets
    while (dayKey(new Date(t.getTime() - 60_000)) === today) t = new Date(t.getTime() - 60_000);
    return t;
}

export function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 86_400_000);
}
