import useIsBrowser from '@docusaurus/useIsBrowser';
import React, { useEffect } from 'react';
import { triggerTrackingEvent } from '../components/trigger-event';
import { PRICE_PRO_MONTHLY, PRICE_PRO_PLUS_MONTHLY } from '../constants';

/**
 * Thank-you page for the premium forms.
 * The forms redirect here with a ?tier= query param
 * (like ?tier=pro or ?tier=pro-plus) so we can track
 * the lead value of the submitted tier.
 * Missing or unknown values fall back to the pro price.
 */
export default function PremiumSubmitted() {
    const isBrowser = useIsBrowser();
    useEffect(() => {
        if (!isBrowser) {
            return;
        }

        const tierParam = new URLSearchParams(location.search).get('tier');
        const isProPlus = (tierParam || '').includes('plus');
        const tier = isProPlus ? 'pro_plus' : 'pro';
        const yearlyPrice = (isProPlus ? PRICE_PRO_PLUS_MONTHLY : PRICE_PRO_MONTHLY) * 12;

        /**
         * Trigger conversion tracking with the
         * lead value of the submitted tier.
         * Assume a lead-to-sale-rate of 33%.
         */
        triggerTrackingEvent(
            'premium_lead',
            Math.floor(yearlyPrice / 3),
            1,
            'Purchase'
        );
        // also track the tier so we can compare the form submits per tier.
        triggerTrackingEvent('premium_lead_' + tier, 0, 1);
    }, [isBrowser]);

    return (
        <main>
            <br />
            <br />
            <br />
            <br />
            <div className='redirectBox' style={{ textAlign: 'center' }}>
                <a href="/" target="_blank">
                    <div className="logo">
                        <img src="/files/logo/logo_text.svg" alt="RxDB" width={120} />
                    </div>
                </a>
                <br />
                <br />
                <h1>RxDB Premium Form Submitted</h1>
                <br />
                <p style={{ padding: 50 }}>
                    Thank you for submitting the form. You will directly get a confirmation email.
                    <br />
                    <b>Please check your spam folder!</b>.
                    <br />
                    In the next 24 hours you will get an email with
                    a preview of the license agreement.
                </p>
                <br />
                <br />
            </div>
        </main >
    );
}
