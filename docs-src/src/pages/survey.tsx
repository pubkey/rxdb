import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React from 'react';

export default function Home() {
    const { siteConfig } = useDocusaurusContext();



    return (
        <Layout
            title={`RxDB User Survey - ${siteConfig.title}`}
            description="RxDB User Survey"
        >
            <main>
                <div className='redirectBox' style={{ textAlign: 'center' }}>
                    <a href="/">
                        <div className="logo">
                            <img src="/files/logo/logo_text.svg" alt="RxDB" width={160} />
                        </div>
                    </a>
                    <h1>RxDB User Survey</h1>
                    <p>
                        <b>You will be redirected in a few seconds.</b>
                    </p>
                    <p>
                        <a href="https://forms.gle/pe8vxaXez1A6X95EA">Click here to open the Survey</a>
                    </p>
                    <meta httpEquiv="Refresh" content="0; url=https://forms.gle/pe8vxaXez1A6X95EA" />
                </div>
            </main>
        </Layout >
    );
}
