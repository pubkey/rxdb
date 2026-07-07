import useIsBrowser from '@docusaurus/useIsBrowser';
import React, { useEffect } from 'react';
import { triggerTrackingEvent } from './trigger-event';

export type PremiumSubmittedProps = {
    /**
     * Suffix for the tier specific tracking event,
     * like 'pro' or 'pro_plus'.
     */
    tierEventId: string;
    /**
     * Yearly price of the tier in dollars.
     * Used to calculate the lead value.
     */
    yearlyPrice: number;
};

export function PremiumSubmitted(props: PremiumSubmittedProps) {
    const isBrowser = useIsBrowser();
    useEffect(() => {
        if (!isBrowser) {
            return;
        }

        /**
         * Trigger conversion tracking with the
         * lead value of the submitted tier.
         * Assume a lead-to-sale-rate of 33%.
         */
        triggerTrackingEvent(
            'premium_lead',
            Math.floor(props.yearlyPrice / 3),
            1,
            'Purchase'
        );
        // also track the tier so we can compare the form submits per tier.
        triggerTrackingEvent('premium_lead_' + props.tierEventId, 0, 1);
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
