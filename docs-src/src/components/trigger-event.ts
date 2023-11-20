export function trigger(type, value) {
    console.log('window trigger: ' + type + ': ' + value);

    // reddit
    if (typeof (window as any).rdt === 'function') {
        (window as any).rdt('track', 'Lead', {
            transactionId: type + '-' + new Date().getTime(),
            value: value
        });
    }

    // google analytics
    if (typeof window.gtag === 'function') {
        window.gtag(
            'event',
            type,
            {
                value,
                currency: 'EUR'
            }
        );
    }
};
