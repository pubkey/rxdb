import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useIsBrowser from '@docusaurus/useIsBrowser';
import Layout from '@theme/Layout';
import React, { useEffect } from 'react';
import { triggerTrackingEvent } from '../components/trigger-event';
const FILE_EVENT_ID = 'paid-meeting-link-clicked';

export default function ServiceSubmitted() {
    const { siteConfig } = useDocusaurusContext();

    const isBrowser = useIsBrowser();
    useEffect(() => {
        if (!isBrowser) {
            return;
        }
        (() => {
            triggerTrackingEvent(FILE_EVENT_ID, 100, 1);
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

