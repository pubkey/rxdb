import useIsBrowser from '@docusaurus/useIsBrowser';
import React, { useEffect } from 'react';
import { FORM_VALUE_DOCUMENT_ID, FormValueDocData } from './premium';
import { triggerTrackingEvent } from '../components/trigger-event';
import { calculatePriceFromFormValueDoc } from '../components/price-calculator';

export default function PremiumSubmitted() {
    const isBrowser = useIsBrowser();
    useEffect(() => {
        if (!isBrowser) {
            return;
        }

        /**
         * Trigger conversion tracking with correct country
         * and lead value
         */
        (async () => {
            const dbModule = await import('../components/database.module');
            console.log('aaaaaa-iframe dbmodule:');
            console.dir(dbModule);
            const database = await dbModule.getDatabase();
            const formValueDoc = await database.getLocal<FormValueDocData>(FORM_VALUE_DOCUMENT_ID);
            console.log('form value docs:');
            console.dir(formValueDoc);
            const price = await calculatePriceFromFormValueDoc(formValueDoc);
            triggerTrackingEvent(
                'premium_lead',
                Math.floor(price.totalPrice / 3), // assume lead-to-sale-rate is 33%.
                1,
                true
            );
        })();
    });

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
