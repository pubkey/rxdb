import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React, { useEffect } from 'react';
import { triggerTrackingEvent } from '../components/trigger-event';

export default function DemoSubmitted() {
    const { siteConfig } = useDocusaurusContext();

    useEffect(() => {
        (() => {
            triggerTrackingEvent('request-demo-sub', 2, 1);
        })();
    });

    return (
        <Layout
            title={`Schedule Demo Submitted - ${siteConfig.title}`}
            description="RxDB Schedule Demo Submitted"
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
                    <h1>RxDB Schedule Demo Submitted Submitted</h1>
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

