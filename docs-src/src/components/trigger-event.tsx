import { useEffect } from 'react';
import { getTestGroupEventPrefix } from './a-b-tests';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

const ATTRIBUTION_KEY = 'rxdb_attribution';

export type AttributionData = {
    gclid?: string;
    gbraid?: string;
    wbraid?: string;
    msclkid?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    referrer?: string;
    landing_page?: string;
};

/**
 * Captures attribution parameters (gclid, gbraid, wbraid, msclkid, utm_*, referrer,
 * landing_page) from the current URL on the first page hit and persists them in
 * localStorage. Subsequent calls are no-ops so the first-touch data is preserved.
 */
export function captureAttribution(): void {
    if (!ExecutionEnvironment.canUseDOM) {
        return;
    }
    // Only capture once (first touch)
    if (localStorage.getItem(ATTRIBUTION_KEY)) {
        return;
    }
    const params = new URLSearchParams(window.location.search);
    const data: AttributionData = {};

    const clickIds = ['gclid', 'gbraid', 'wbraid', 'msclkid'] as const;
    for (const key of clickIds) {
        const val = params.get(key);
        if (val) {
            data[key] = val;
        }
    }

    for (const [key, val] of params.entries()) {
        if (key.startsWith('utm_')) {
            (data as any)[key] = val;
        }
    }

    if (document.referrer) {
        data.referrer = document.referrer;
    }

    data.landing_page = window.location.href;

    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(data));
}

/**
 * Returns the attribution data captured on the first page hit, or an empty object
 * when no data is available.
 */
export function getAttribution(): AttributionData {
    if (!ExecutionEnvironment.canUseDOM) {
        return {};
    }
    try {
        const raw = localStorage.getItem(ATTRIBUTION_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}


export type RedditEventType =
    | 'PageVisit'
    | 'ViewContent'
    | 'Search'
    | 'AddToCart'
    | 'Lead'
    | 'Purchase';

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
            const attribution = getAttribution();
            const attributionPayload: Record<string, string> = {};
            if (attribution.gclid) {
                attributionPayload['gclid'] = attribution.gclid;
            }
            if (attribution.landing_page) {
                attributionPayload['landing_page'] = attribution.landing_page;
            }
            if (attribution.utm_term) {
                attributionPayload['landing_keyword'] = attribution.utm_term;
            }
            (window as any).gtag(
                'event',
                type,
                {
                    value,
                    currency: 'EUR',
                    ...attributionPayload
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
