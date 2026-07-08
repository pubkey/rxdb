import { useEffect } from 'react';
import { getTestGroupEventPrefix } from './a-b-tests';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';


export type RedditEventType =
    | 'PageVisit'
    | 'ViewContent'
    | 'Search'
    | 'AddToCart'
    | 'Lead'
    | 'Purchase';

const CONVERSION_WORKER_URL = 'https://rxdb-events.daniel-meyer-e90.workers.dev/api/e';
/**
 * Written by storeAdClickId() in Root.tsx when the user lands with a
 * gclid/gbraid/wbraid URL param. Shape: { k, v, t }.
 */
export const AD_CLICK_STORAGE_ID = 'click_id';

/**
 * Important conversion events that are ALWAYS sent to the conversion worker,
 * even without an ad click id, so they are never lost to ad blockers.
 * All other events are sent only when a click id is stored (then Google Ads
 * attribution is possible).
 */
export const IMPORTANT_WORKER_EVENTS = new Set([
    'dev_mode_tracking_iframe',
    'console-log-click',
    'premium_lead',
    'request-demo-sub',
    'copy_on_page',
    'visit_x_urls'
]);

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
        return parsed;
    } catch (err) {
        return null;
    }
}

/**
 * GA4 client id: the real one from the _ga cookie when google analytics
 * runs, otherwise a self-minted stable id. The worker uses it to forward
 * the event to the GA4 Measurement Protocol.
 */
function getOrMintClientId(): string {
    const fromCookie = document.cookie.match(/_ga=GA\d+\.\d+\.(\d+\.\d+)/);
    if (fromCookie) {
        return fromCookie[1];
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

/**
 * Sends tracking events to the conversion worker, independent of whether
 * google analytics is blocked or not:
 * - important events are ALWAYS sent,
 * - all other events are sent when an ad click id is stored, so Google Ads
 *   can import them as offline conversions (which event names count, and
 *   whether they are primary or secondary, is decided in Google Ads by which
 *   conversion actions exist).
 * The client id is always attached so the worker can forward the event to
 * the GA4 Measurement Protocol.
 */
function sendToConversionWorker(type: string, value: number) {
    try {
        const adClick = getStoredAdClickId();
        if (!adClick && !IMPORTANT_WORKER_EVENTS.has(type)) {
            return;
        }
        const payload: any = {
            type,
            value,
            cid: getOrMintClientId(),
            sid: getSessionId()
        };
        if (adClick) {
            payload.clid = adClick.v;
            payload.clidKind = adClick.k;
        }
        const body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
            navigator.sendBeacon(CONVERSION_WORKER_URL, body);
        } else {
            fetch(CONVERSION_WORKER_URL, { method: 'POST', body, keepalive: true }).catch(() => { });
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
            const testGroupPrefix = getTestGroupEventPrefix();
            if (testGroupPrefix) {
                (window as any).gtag(
                    'event',
                    testGroupPrefix + '_' + type,
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
