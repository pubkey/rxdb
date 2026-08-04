import React from 'react';

/**
 * Renders how long ago a date was, like "4 months ago" or "3 years ago".
 *
 * The value is calculated when the page is rendered, so the statically
 * generated HTML carries the distance as of the last docs build and the
 * browser corrects it on hydration. Writing "the last commit was in
 * March 2022, <TimeSince date="2022-03-28" />" therefore stays true without
 * anyone editing the sentence again.
 *
 * Usage in any docs page, no import needed (registered globally in
 * src/theme/MDXComponents):
 *
 *   <TimeSince date="2022-03-28" />                  -> 4 years ago
 *   <TimeSince date="2022-03-28" unit="months" />    -> 52 months ago
 *   <TimeSince date="2026-07-08" />                  -> 22 days ago
 */
export function TimeSince(props: {
    /**
     * The date to measure from, as an ISO date like "2022-03-28".
     */
    date: string;
    /**
     * (optional) Which unit to render in. 'auto' picks days below a month,
     * months below two years and years above that. [default='auto']
     */
    unit?: 'auto' | 'days' | 'months' | 'years';
}) {
    return (
        <span suppressHydrationWarning={true}>
            {timeSince(props.date, new Date(), props.unit)}
        </span>
    );
}

/**
 * Exported for the tests and for callers that need the plain string.
 */
export function timeSince(
    isoDate: string,
    now: Date,
    unit: 'auto' | 'days' | 'months' | 'years' = 'auto'
): string {
    const then = parseIsoDate(isoDate);
    const days = Math.floor((toUtcDay(now) - toUtcDay(then)) / MILLISECONDS_PER_DAY);
    if (days < 0) {
        throw new Error('TimeSince: the date ' + isoDate + ' is in the future');
    }
    const months = fullMonthsBetween(then, now);
    const years = Math.floor(months / 12);

    // a forced unit falls back to the next smaller one instead of
    // rendering "0 months ago"
    if (unit === 'days' || months < 1) {
        if (days === 0) {
            return 'today';
        }
        return plural(days, 'day');
    }
    if ((unit === 'years' || unit === 'auto') && years >= (unit === 'years' ? 1 : 2)) {
        return plural(years, 'year');
    }
    return plural(months, 'month');
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function plural(amount: number, unit: string): string {
    return amount + ' ' + unit + (amount === 1 ? '' : 's') + ' ago';
}

/**
 * Counts whole calendar months, so 2022-03-28 to 2022-04-27 is 0 months and
 * 2022-03-28 to 2022-04-28 is 1 month. Dividing days by an average month
 * length drifts by a day or two per year, which shows up in the rendered text.
 */
function fullMonthsBetween(then: Date, now: Date): number {
    let months = (now.getUTCFullYear() - then.getUTCFullYear()) * 12
        + (now.getUTCMonth() - then.getUTCMonth());
    if (now.getUTCDate() < then.getUTCDate()) {
        months--;
    }
    return Math.max(0, months);
}

function parseIsoDate(isoDate: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
    if (!match) {
        throw new Error('TimeSince: not an ISO date like 2022-03-28: ' + isoDate);
    }
    return new Date(Date.UTC(
        parseInt(match[1], 10),
        parseInt(match[2], 10) - 1,
        parseInt(match[3], 10)
    ));
}

/**
 * Strips the time part so the result does not depend on the hour a page is
 * built or opened.
 */
function toUtcDay(date: Date): number {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
