import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React, { useEffect } from 'react';
import { triggerTrackingEvent } from '../components/trigger-event';

export default function Chat() {
    const { siteConfig } = useDocusaurusContext();

    useEffect(() => {
        triggerTrackingEvent('join_chat', 0.40);
    });

    return (
        <Layout
            title={`Chat - ${siteConfig.title}`}
            description="RxDB Community Chat"
        >
            <main>
                <div className='redirectBox' style={{ textAlign: 'center' }}>
                    <a href="/">
                        <div className="logo">
                            <img src="/files/logo/logo_text.svg" alt="RxDB" width={160} />
                        </div>
                    </a>
                    <h1>💬 RxDB Chat</h1>
                    <p>
                        <b>You will be redirected in a few seconds.</b>
                    </p>
                    <p>
                        <a href="https://discord.gg/krNZtjZtpu">Click here to open Chat</a>
                    </p>
                    <meta httpEquiv="Refresh" content="1; url=https://discord.gg/krNZtjZtpu" />
                </div>
            </main>
        </Layout >
    );
}
