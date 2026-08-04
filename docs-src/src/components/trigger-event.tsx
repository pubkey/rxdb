import { useEffect } from 'react';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import { isLikelyEuUser } from '../theme/eu-consent';

/**
 * Gates all tracking. EU/EEA visitors start blocked and are only unlocked
 * by setTrackingConsent(true) once they accept via the consent banner.
 * Everyone else is allowed from the first event, matching the previous
 * behavior. During SSR we stay blocked (no events fire there anyway).
 */
let trackingConsentGranted = ExecutionEnvironment.canUseDOM
    ? !isLikelyEuUser()
    : false;

/**
 * Called by the consent manager once the visitor made a choice.
 */
export function setTrackingConsent(granted: boolean): void {
    trackingConsentGranted = granted;
}


export type RedditEventType =
    | 'PageVisit'
    | 'ViewContent'
    | 'Search'
    | 'AddToCart'
    | 'Lead'
    | 'Purchase';

const CONVERSION_WORKER_URL = 'https://rxdb-events.daniel-meyer-e90.workers.dev';
/**
 * Written by storeAdClickId() in Root.tsx when the user lands with a
 * gclid/gbraid/wbraid URL param. Shape: { k, v, t }.
 */
export const AD_CLICK_STORAGE_ID = 'click_id';

/**
 * Google Ads' maximum click-through conversion window is 90 days. A stored
 * click id older than that can never be imported ("this click is too old"),
 * and attributing a later (often organic) visit to a months-old ad click would
 * be wrong anyway. So we ignore (and clear) stale ids instead of uploading
 * conversions against them forever.
 */
const AD_CLICK_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

function getStoredAdClickId(): { k: string; v: string; t: number; } | null {
    try {
        const raw = localStorage.getItem(AD_CLICK_STORAGE_ID);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.v) {
            return null;
        }
        if (typeof parsed.t !== 'number' || Date.now() - parsed.t > AD_CLICK_MAX_AGE_MS) {
            localStorage.removeItem(AD_CLICK_STORAGE_ID);
            return null;
        }
        return parsed;
    } catch (err) {
        return null;
    }
}

/**
 * Self-minted stable GA4-style client id. Only used when no _ga cookie
 * exists, so the worker can forward events to the GA4 Measurement Protocol.
 */
function getOrMintClientId(): string {
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

/**
 * Our ad final URLs carry the full utm parameter set
 * (utm_source/medium/campaign/content/term), see the campaign generator in the
 * internal repo. The utm_campaign value is persisted here so that later events
 * of the same visitor can still be attributed to the campaign, and so the SEM
 * landing pages can key their a/b-test variation off it
 * (getSemVariation() in a-b-tests.tsx).
 */
export const UTM_CAMPAIGN_STORAGE_ID = 'utm_campaign';
/**
 * localStorage key prefix under which getSemVariation() stores the assigned
 * landing-page variation letter, keyed by the utm_campaign value.
 */
export const SEM_VARIATION_STORAGE_PREFIX = 'sem-variation-';

/**
 * Returns the current utm_campaign: from the URL when present (persisting it,
 * last touch wins - like storeAdClickId()), otherwise from localStorage.
 * Reading the URL first matters because a landing page's own effects run
 * before the Root component's effects, so the sem pages cannot rely on the
 * value having been stored already.
 */
export function getUtmCampaign(): string | null {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return null;
    }
    try {
        const fromUrl = new URLSearchParams(location.search).get('utm_campaign');
        if (fromUrl) {
            localStorage.setItem(UTM_CAMPAIGN_STORAGE_ID, fromUrl);
            return fromUrl;
        }
        return localStorage.getItem(UTM_CAMPAIGN_STORAGE_ID);
    } catch (err) {
        return null;
    }
}

/**
 * Prefix for the per-campaign a/b-test events, built from the stored
 * utm_campaign plus the sem-page variation letter (when one was assigned),
 * e.g. "utm_indexeddb_va". The letter is a stable variation id (see
 * getSemVariation() in a-b-tests.tsx), not an array position.
 * This replaced the old invented test-group system (getTestGroupEventPrefix).
 * GA4 event names only allow letters, digits and underscores and are capped
 * at 40 chars total, so the campaign part is sanitized and truncated to keep
 * prefix + '_' + event type within the limit.
 */
function getUtmEventPrefix(): string | false {
    const campaign = getUtmCampaign();
    if (!campaign) {
        return false;
    }
    let prefix = 'utm_' + campaign
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .substring(0, 12);
    const semVariation = localStorage.getItem(SEM_VARIATION_STORAGE_PREFIX + campaign);
    if (semVariation !== null) {
        prefix += '_v' + semVariation;
    }
    return prefix;
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
 * Sends every tracking event to the conversion worker. The paths are neutral
 * slugs (/api/gads, /api/glytics) on purpose: the worker is on a workers.dev
 * URL, so the path is the only thing an ad blocker can match, and the literal
 * strings "google-ads"/"google-analytics" are exactly what blocklists look
 * for, which would drop these beacons for the ad-blocking part of our
 * audience (the users this worker exists to recover).
 * - to /api/gads when an ad click id is stored, so Google Ads can import the
 *   event as an offline conversion,
 * - to /api/glytics when no google-analytics cookie exists (gtag blocked or
 *   never loaded), so the worker forwards the event to the GA4 Measurement
 *   Protocol. Users with a _ga cookie already report via gtag; skipping them
 *   here prevents double counting.
 */
function sendToConversionWorker(type: string, value: number) {
    try {
        const adClick = getStoredAdClickId();
        if (adClick) {
            postToWorker('/api/gads', {
                type,
                value,
                clid: adClick.v,
                clidKind: adClick.k
            });
        }
        if (!document.cookie.includes('_ga=')) {
            postToWorker('/api/glytics', {
                type,
                value,
                cid: getOrMintClientId(),
                sid: getSessionId()
            });
        }
    } catch (err) {
        console.log('# Error on conversion-worker trigger:');
        console.dir(err);
    }
}

export function triggerTrackingEvent(
    type: string,
    value: number,
    /**
     * Only track the same event X amount of times per users.
     * This helps to prevent polluting the stats when a singler user
     * does something many many times.
     */
    maxPerUser: number = 5,
    redditEventType?: RedditEventType,
    /**
     * Used in the reddit search-event.
     */
    redditSearchTerm?: string
) {
    if (!ExecutionEnvironment.canUseDOM) {
        return;
    }
    /**
     * Do not send anything to analytics, ad or conversion services until the
     * visitor allowed it. For non-EU visitors this is granted by default.
     */
    if (!trackingConsentGranted) {
        return;
    }
    const prefix = 'event_count_';
    const stored = localStorage.getItem(prefix + type);
    const triggeredBefore = stored ? parseInt(stored, 10) : 0;
    // console.log('triggeredBefore: ' + triggeredBefore);
    if (triggeredBefore >= maxPerUser) {
        return;
    }
    localStorage.setItem(prefix + type, (triggeredBefore + 1) + '');

    console.log('triggerTrackingEvent(' + type + ', ' + value + ', redditEventType=' + redditEventType + ' ' + triggeredBefore + '/' + maxPerUser + ')');

    /**
     * Google Ads conversion worker (runs after the same frequency capping
     * as the other trackers).
     */
    sendToConversionWorker(type, value);

    /**
     * Reddit does not have a concept of conversion-value
     * so we only track primary events because otherwise everything would
     * be counted as equally worthy conversion.
     */
    if (
        redditEventType &&
        typeof (window as any).rdt === 'function'
    ) {
        try {
            (window as any).rdt('track', redditEventType, {
                transactionId: type + '-' + new Date().getTime(),
                currency: 'EUR',
                value: value,
                search_string: redditSearchTerm
            });
        } catch (err) {
            console.log('# Error on reddit trigger:');
            console.dir(err);
        }
    }

    // google analytics
    if (typeof (window as any).gtag === 'function') {
        try {
            (window as any).gtag(
                'event',
                type,
                {
                    value,
                    currency: 'EUR'
                }
            );

            // trigger also an event for the A/B Testing
            const utmPrefix = getUtmEventPrefix();
            if (utmPrefix) {
                (window as any).gtag(
                    'event',
                    utmPrefix + '_' + type,
                    {
                        value: 0,
                        currency: 'EUR'
                    }
                );
            }

        } catch (err) {
            console.log('# Error on google trigger:');
            console.dir(err);
        }
    }
}


type TriggerTrackingEventArgs = Parameters<typeof triggerTrackingEvent>;

type TriggerEventProps = {
    type: TriggerTrackingEventArgs[0];
    value: TriggerTrackingEventArgs[1];
    maxPerUser?: TriggerTrackingEventArgs[2];
    redditEventType?: TriggerTrackingEventArgs[3];
};

/**
 * Empty component that can be used in .mdx files
 * to trigger events on page load.
 */
export function TriggerEvent(props: TriggerEventProps) {
    useEffect(() => {
        if (!ExecutionEnvironment.canUseDOM) return;
        triggerTrackingEvent(
            props.type,
            props.value,
            props.maxPerUser,
            props.redditEventType
        );
    }, []);
    return <></>;
}

export function onCopy() {
    triggerTrackingEvent('copy_on_page', 1.5, 1, 'Lead');
}
