import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React from 'react';

export default function Home() {
    const { siteConfig } = useDocusaurusContext();



    return (
        <Layout
            title={`Chat - ${siteConfig.title}`}
            description="RxDB Community Chat"
        >
            <main>
                <div className='redirectBox' style={{ textAlign: 'center' }}>
                    <a href="/">
                        <div className="logo">
                            <img src="./files/logo/logo_text.svg" alt="RxDB" width={160} />
                        </div>
                    </a>
                    <h1>💬 RxDB Chat</h1>
                    <p>
                        <b>You will be redirected in a few seconds.</b>
                    </p>
                    <p>
                        <a href="https://discord.gg/tqt9ZttJfD">Click here to open Chat</a>
                    </p>
                    <meta httpEquiv="Refresh" content="0; url=https://discord.gg/tqt9ZttJfD" />
                </div>
            </main>
        </Layout >
    );
}
