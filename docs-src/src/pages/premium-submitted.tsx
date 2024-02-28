import useIsBrowser from '@docusaurus/useIsBrowser';
import React, { useEffect } from 'react';
import { getDatabase, hasIndexedDB } from '../components/database';
import { FORM_VALUE_DOCUMENT_ID, FormValueDocData } from './premium';

export default function PremiumSubmitted() {
    const isBrowser = useIsBrowser();
    useEffect(() => {
        if (!isBrowser || !hasIndexedDB()) {
            return;
        }

        /**
         * Trigger conversion tracking with correct country
         * and lead value
         */
        (async () => {
            const database = await getDatabase();
            const formValueDoc = await database.getLocal<FormValueDocData>(FORM_VALUE_DOCUMENT_ID);
            console.dir(formValueDoc);
            if (!formValueDoc) {
                window.trigger('premium_lead_unknown', 300);
                await database.upsertLocal<FormValueDocData>(FORM_VALUE_DOCUMENT_ID, {
                    formSubmitted: true
                });
            } else {
                if (formValueDoc._data.data.formSubmitted) {
                    console.log('# lead already tracked');
                    return;
                }
                window.trigger(
                    'premium_lead_' + formValueDoc._data.data.homeCountry.toLowerCase(),
                    Math.floor(formValueDoc._data.data.price / 3) // assume lead-to-sale-rate is 33%.
                );
                await formValueDoc.incrementalPatch({formSubmitted: true});
            }
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
