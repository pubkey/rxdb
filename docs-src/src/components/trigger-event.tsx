import { useEffect } from 'react';
import { getTestGroupEventPrefix } from './a-b-tests';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

export function triggerTrackingEvent(
    type: string,
    value: number,
    /**
     * Only track the same event X amount of times per users.
     * This helps to prevent polluting the stats when a singler user
     * does something many many times.
     */
    maxPerUser: number = 5,
    primary: boolean = false
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

    console.log('triggerTrackingEvent(' + type + ', ' + value + ', primary=' + primary + ' ' + triggeredBefore + '/' + maxPerUser + ')');

    /**
     * Reddit does not have a concept of conversion-value
     * so we only track primary events because otherwise everything would
     * be counted as equally worthy conversion.
     */
    if (
        primary &&
        typeof (window as any).rdt === 'function'
    ) {
        try {
            (window as any).rdt('track', 'Lead', {
                transactionId: type + '-' + new Date().getTime(),
                currency: 'EUR',
                value: value
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

/**
 * Empty component that can be used in .mdx files
 * to trigger events on page load.
 */
export function TriggerEvent(props) {
    useEffect(() => {
        if (!ExecutionEnvironment.canUseDOM) return;
        triggerTrackingEvent(
            props.type,
            props.value,
            props.maxPerUser,
            props.primary
        );
    }, []);
    return <></>;
}
