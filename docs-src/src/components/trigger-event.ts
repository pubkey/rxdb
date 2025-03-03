import { getTestGroupEventPrefix } from './a-b-tests';

export function triggerTrackingEvent(type: string, value: number, onlyTrackOnce: boolean) {

    const prefix = 'tracking_event_';
    if (onlyTrackOnce) {
        const stored = localStorage.getItem(prefix + type);
        if (stored) {
            return;
        }
        localStorage.setItem(prefix + type, '1');
    }

    console.log('triggerTrackingEvent(' + type + ', ' + value + ', ' + onlyTrackOnce + ')');

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
