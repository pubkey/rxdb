import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React, { useEffect, useState } from 'react';


export default function Home() {
    const { siteConfig } = useDocusaurusContext();
    const [redirectUrl, setRedirectUrl] = useState('https://github.com/pubkey/rxdb');

    useEffect(() => {
        // triggerTrackingEvent('goto_code', 0.40);

        let finalUrl = 'https://github.com/pubkey/rxdb';
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const release = params.get('version');
            if (release) {
                finalUrl = `https://github.com/pubkey/rxdb/releases/tag/${release}`;
            }
        }
        setRedirectUrl(finalUrl);

        const timer = setTimeout(() => {
            if (typeof window !== 'undefined') {
                window.location.href = finalUrl;
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

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
                    <h1>RxDB Release</h1>
                    <p>
                        <b>You will be redirected in a few seconds.</b>
                    </p>
                    <p>
                        <a href={redirectUrl}>Click here to open Code</a>
                    </p>
                    <meta httpEquiv="Refresh" content={`1; url=${redirectUrl}`} />
                </div>
            </main>
        </Layout >
    );
}
