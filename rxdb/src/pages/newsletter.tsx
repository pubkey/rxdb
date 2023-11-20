import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React from 'react';

export default function Home() {
    const { siteConfig } = useDocusaurusContext();



    return (
        <Layout
            title={`Newsletter - ${siteConfig.title}`}
            description="RxDB Newsletter"
        >
            <main>
                <div className='redirectBox' style={{ textAlign: 'center' }}>
                    <a href="/">
                        <div className="logo">
                            <img src="./files/logo/logo_text.svg" alt="RxDB" width={160} />
                        </div>
                    </a>
                    <h1>RxDB Newsletter</h1>
                    <p>
                        <b>You will be redirected in a few seconds.</b>
                    </p>
                    <p>
                        <a href="http://eepurl.com/imD7WA">Click here</a>
                    </p>
                    <meta httpEquiv="Refresh" content="0; url=http://eepurl.com/imD7WA" />
                </div>
            </main>
        </Layout >
    );
}
