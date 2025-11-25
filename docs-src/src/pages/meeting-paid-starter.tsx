import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React, { useEffect } from 'react';
import { triggerTrackingEvent } from '../components/trigger-event';
const FILE_EVENT_ID = 'paid-meeting-link-clicked-starter-pack';

export default function Meeting() {
    const { siteConfig } = useDocusaurusContext();
    useEffect(() => {
        (() => {
            triggerTrackingEvent(FILE_EVENT_ID, 100, 1);
        })();
    });

    return (
        <Layout
            title={`Meeting - ${siteConfig.title}`}
            description="RxDB Meeting Scheduler"
        >
            <main>
                <div className='redirectBox' style={{ textAlign: 'center' }}>
                    <a href="/">
                        <div className="logo">
                            <img src="/files/logo/logo_text.svg" alt="RxDB" width={160} />
                        </div>
                    </a>
                    <h1>RxDB Meeting Scheduler</h1>
                    <p>
                        <b>You will be redirected in a few seconds.</b>
                    </p>
                    <p>
                        <a href="https://rxdb.pipedrive.com/scheduler/LzExD5CX/meeting-starter-pack">Click here</a>
                    </p>
                    <meta httpEquiv="Refresh" content="0; url=https://rxdb.pipedrive.com/scheduler/LzExD5CX/meeting-starter-pack" />
                </div>
            </main>
        </Layout >
    );
}

