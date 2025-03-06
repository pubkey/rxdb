import { getTestGroupEventPrefix } from './a-b-tests';

export function triggerTrackingEvent(
    type: string,
    value: number,
    /**
     * Only track the same event X amount of times per users.
     * This helps to prevent polluting the stats when a singler user
     * does something many many times.
     */
    maxPerUser: number = 5
) {

    const prefix = 'event_count_';
    const stored = localStorage.getItem(prefix + type);
    const triggeredBefore = stored ? parseInt(stored, 10) : 0;
    // console.log('triggeredBefore: ' + triggeredBefore);
    if (triggeredBefore >= maxPerUser) {
        return;
    }
    localStorage.setItem(prefix + type, (triggeredBefore + 1) + '');

    console.log('triggerTrackingEvent(' + type + ', ' + value + ', ' + triggeredBefore + '/' + maxPerUser + ')');

    // reddit
    if (typeof (window as any).rdt === 'function') {
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
