import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Head from '@docusaurus/Head';
import Layout from '@theme/Layout';
import React from 'react';

export default function LegalNotice() {
    const { siteConfig } = useDocusaurusContext();

    return (
        <>
            <Head>
                <meta name="robots" content="noindex"></meta>
            </Head>
            <Layout
                title={`Legal Notice - ${siteConfig.title}`}
                description="RxDB Legal Notice"
            >
                <main>
                    <div className='redirectBox' style={{ textAlign: 'center' }}>
                        <a href="/">
                            <div className="logo">
                                <img src="/files/logo/logo_text.svg" alt="RxDB" width={160} />
                            </div>
                        </a>
                        <h1><a href="https://rxdb.info/">RxDB</a> Legal Notice</h1>
                        <p>
                            Daniel Meyer<br />
                            c/o Grosch Postflex #1154<br />
                            Emsdettener Str. 10<br />
                            48268 Greven<br />
                            Email: <br />
                            <img src="/files/imprint-email.png" />
                        </p>
                    </div>
                </main>
            </Layout >
        </>
    );
}
