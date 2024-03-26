import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useIsBrowser from '@docusaurus/useIsBrowser';
import Layout from '@theme/Layout';
import React, { useEffect } from 'react';
import { getDatabase, hasIndexedDB } from '../components/database';
const FILE_EVENT_ID = 'paid-meeting-link-clicked';

export default function ServiceSubmitted() {
    const { siteConfig } = useDocusaurusContext();

    const isBrowser = useIsBrowser();
    useEffect(() => {
        if (!isBrowser || !hasIndexedDB()) {
            return;
        }
        (async () => {
            const database = await getDatabase();
            const flagDoc = await database.getLocal(FILE_EVENT_ID);
            if (flagDoc) {
                console.log('# already tracked ' + FILE_EVENT_ID);
            } else {
                window.trigger(
                    FILE_EVENT_ID,
                    100
                );
                await database.upsertLocal(FILE_EVENT_ID, {});
            }
        })();
    });

    return (
        <Layout
            title={`Service Request Submitted - ${siteConfig.title}`}
            description="RxDB Meeting Scheduler"
        >
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
                    <h1>RxDB Service Form Submitted</h1>
                    <br />
                    <p style={{ padding: 50 }}>
                        Thank you for submitting the form. You will directly get a confirmation email.
                        <br />
                        <b>Please check your spam folder!</b>.
                        <br />
                        In the next 24 hours you will get a full answer via email.
                    </p>
                    <br />
                    <br />
                </div>
            </main >
        </Layout >
    );
}

