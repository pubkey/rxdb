import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React, { useEffect } from 'react';
import { triggerTrackingEvent } from '../components/trigger-event';

export default function Home() {
    const { siteConfig } = useDocusaurusContext();
    useEffect(() => {
        triggerTrackingEvent('goto_code', 0.40);
    });


    return (
        <Layout
            title={`Code - ${siteConfig.title}`}
            description="RxDB Source Code"
        >
            <main>
                <div className='redirectBox' style={{ textAlign: 'center' }}>
                    <a href="/">
                        <div className="logo">
                            <img src="/files/logo/logo_text.svg" alt="RxDB" width={160} />
                        </div>
                    </a>
                    <h1>RxDB Code</h1>
                    <p>
                        <b>You will be redirected in a few seconds.</b>
                    </p>
                    <p>
                        <a href="https://github.com/pubkey/rxdb">Click here to open Code</a>
                    </p>
                    <meta httpEquiv="Refresh" content="1; url=https://github.com/pubkey/rxdb" />
                </div>
            </main>
        </Layout >
    );
}
