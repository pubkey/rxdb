import { useEffect } from 'react';
import { getTestGroupEventPrefix } from './a-b-tests';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

export const GOOGLE_ADS_CONVERSION_ID = 'AW-16993451567';

/**
 * Maps tracking event types to Google Ads conversion labels.
 * Each label corresponds to a distinct conversion action configured
 * in the Google Ads account under the conversion ID above.
 */
export const GOOGLE_ADS_CONVERSION_LABELS: Record<string, string> = {
    premium_lead: 'uAlvCNWL4tkaELe3-_o',
    calculate_premium_price: 'ZM0dCNaL4tkaELe3-_o',
    consulting_form_open: 'bVCkCNiL4tkaELe3-_o',
    watch_video_x_secs: 'yVGkCNuL4tkaELe3-_o',
    copy_on_page: 'kRmkCN-L4tkaELe3-_o',
};


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

            // Google Ads conversion tracking
            const conversionLabel = GOOGLE_ADS_CONVERSION_LABELS[type];
            if (conversionLabel) {
                (window as any).gtag(
                    'event',
                    'conversion',
                    {
                        send_to: GOOGLE_ADS_CONVERSION_ID + '/' + conversionLabel,
                        value,
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
