/**
 * Tracks the first time a visitor opens the database viewer.
 *
 * The viewer is a standalone html page without gtag.js, so the event is
 * sent to the same conversion worker that the docs use in
 * docs-src/src/components/trigger-event.tsx:
 * - /api/glytics forwards it to the GA4 Measurement Protocol,
 *   where it is marked as a key event.
 * - /api/gads uploads it as a Google Ads conversion when the visitor
 *   came in over an ad click (stored click id).
 * The page is served from rxdb.info, so it shares localStorage and cookies
 * (consent choice, ad click id, GA client id) with the docs pages.
 */

export const DBVIEWER_OPEN_EVENT_TYPE = 'dbviewer_open';
const DBVIEWER_OPEN_EVENT_VALUE = 10;

const CONVERSION_WORKER_URL = 'https://rxdb-events.daniel-meyer-e90.workers.dev';
const TRACKED_HOSTNAMES = ['rxdb.info', 'www.rxdb.info'];
const EVENT_COUNT_PREFIX = 'event_count_';
const AD_CLICK_STORAGE_ID = 'click_id';
const AD_CLICK_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const CONSENT_COOKIE_NAME = 'cc_cookie';

/**
 * Same timezone heuristic as isLikelyEuUser() in
 * docs-src/src/theme/eu-consent.ts, reduced to the timezone prefixes
 * because this page must stay small. When unsure, the visitor is treated
 * as an EU visitor so nothing is sent without consent.
 */
function isLikelyEuUser(): boolean {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!timezone) {
            return true;
        }
        return timezone.startsWith('Europe/') ||
            [
                'Asia/Famagusta',
                'Asia/Nicosia',
                'Atlantic/Azores',
                'Atlantic/Madeira',
                'Atlantic/Canary',
                'Atlantic/Reykjavik'
            ].includes(timezone);
    } catch (err) {
        return true;
    }
}

function readCookie(name: string): string | null {
    const match = document.cookie
        .split('; ')
        .find(part => part.startsWith(name + '='));
    return match ? decodeURIComponent(match.substring(name.length + 1)) : null;
}

/**
 * Reads the categories the visitor accepted in the consent banner
 * of the docs (vanilla-cookieconsent stores them in the cc_cookie).
 */
function getConsent(): { analytics: boolean; marketing: boolean; } {
    if (!isLikelyEuUser()) {
        return { analytics: true, marketing: true };
    }
    try {
        const raw = readCookie(CONSENT_COOKIE_NAME);
        const categories: string[] = raw ? (JSON.parse(raw).categories || []) : [];
        return {
            analytics: categories.includes('analytics'),
            marketing: categories.includes('marketing')
        };
    } catch (err) {
        return { analytics: false, marketing: false };
    }
}

function getStoredAdClickId(): { k: string; v: string; } | null {
    try {
        const raw = localStorage.getItem(AD_CLICK_STORAGE_ID);
        const parsed = raw ? JSON.parse(raw) : null;
        if (
            !parsed ||
            !parsed.v ||
            typeof parsed.t !== 'number' ||
            Date.now() - parsed.t > AD_CLICK_MAX_AGE_MS
        ) {
            return null;
        }
        return parsed;
    } catch (err) {
        return null;
    }
}

/**
 * Uses the client id of the _ga cookie (GA1.1.<id>.<timestamp>) so the
 * event is attributed to the same GA4 user as the docs visit. Falls back
 * to the self-minted id that trigger-event.tsx uses when gtag is blocked.
 */
function getClientId(): string {
    const ga = readCookie('_ga');
    if (ga) {
        const parts = ga.split('.');
        if (parts.length >= 4) {
            return parts.slice(-2).join('.');
        }
    }
    let cid = localStorage.getItem('worker_cid');
    if (!cid) {
        cid = Math.floor(Math.random() * 1e10) + '.' + Math.floor(Date.now() / 1000);
        localStorage.setItem('worker_cid', cid);
    }
    return cid;
}

function getSessionId(): string {
    try {
        let sid = sessionStorage.getItem('worker_sid');
        if (!sid) {
            sid = Math.floor(Date.now() / 1000) + '';
            sessionStorage.setItem('worker_sid', sid);
        }
        return sid;
    } catch (err) {
        return Math.floor(Date.now() / 1000) + '';
    }
}

function postToWorker(path: string, payload: any) {
    const body = JSON.stringify(payload);
    const url = CONVERSION_WORKER_URL + path;
    if (navigator.sendBeacon) {
        navigator.sendBeacon(url, body);
    } else {
        fetch(url, { method: 'POST', body, keepalive: true }).catch(() => { });
    }
}

/**
 * Sends the dbviewer_open event once per visitor. Self-hosted copies of
 * the viewer page never send anything.
 */
export function trackFirstViewerOpen() {
    try {
        if (!TRACKED_HOSTNAMES.includes(location.hostname)) {
            return;
        }
        const consent = getConsent();
        if (!consent.analytics && !consent.marketing) {
            return;
        }
        const countKey = EVENT_COUNT_PREFIX + DBVIEWER_OPEN_EVENT_TYPE;
        if (localStorage.getItem(countKey)) {
            return;
        }
        localStorage.setItem(countKey, '1');

        if (consent.analytics) {
            postToWorker('/api/glytics', {
                type: DBVIEWER_OPEN_EVENT_TYPE,
                value: DBVIEWER_OPEN_EVENT_VALUE,
                cid: getClientId(),
                sid: getSessionId()
            });
        }
        const adClick = consent.marketing ? getStoredAdClickId() : null;
        if (adClick) {
            postToWorker('/api/gads', {
                type: DBVIEWER_OPEN_EVENT_TYPE,
                value: DBVIEWER_OPEN_EVENT_VALUE,
                clid: adClick.v,
                clidKind: adClick.k
            });
        }
    } catch (err) {
        // localStorage or cookies can be unavailable, tracking is then skipped
    }
}
