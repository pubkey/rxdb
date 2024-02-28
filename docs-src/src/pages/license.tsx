/**
 * We use pipedrive as a sales tool.
 * However sharing pipedrive url directly in emails
 * has shown to increase the likelihood of landing in spam filters.
 * Therefore just use a rxdb.info link that redirects to pipedrive.
 * This also allows to track the conversion event.
 */
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React, { useEffect } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { getDatabase, hasIndexedDB } from '../components/database';

const FILE_EVENT_ID = 'license-opened';

export default function LicensePreview() {
    const { siteConfig } = useDocusaurusContext();

    const isBrowser = useIsBrowser();
    useEffect(() => {
        if (!isBrowser || !hasIndexedDB()) {
            return;
        }

        (async () => {
            const database = await getDatabase();
            const flagDoc = await database.getLocal(FILE_EVENT_ID);
            if (flagDoc) {
                console.log('# file opening already tracked');
            } else {
                const myParam = new URLSearchParams(window.location.search).get('v');
                const value = myParam ? parseInt(myParam, 10) : 300;
                window.trigger(
                    'premium_license_opened',
                    Math.floor(value / 3) // assume lead-to-sale-rate is 33%.
                );
                await database.upsertLocal(FILE_EVENT_ID, {});
            }
        })();
    });


    let goalUrl = 'https://rxdb.pipedrive.com/documents/p/';
    if (isBrowser) {
        const myParam = new URLSearchParams(window.location.search).get('f');
        goalUrl += myParam;
    }

    return (
        <Layout
            title={`Chat - ${siteConfig.title}`}
            description="License Preview"
        >
            <main>
                <div className='redirectBox' style={{ textAlign: 'center' }}>
                    <a href="/">
                        <div className="logo">
                            <img src="/files/logo/logo_text.svg" alt="RxDB" width={160} />
                        </div>
                    </a>
                    <h1>RxDB License Preview</h1>
                    <p>
                        <b>You will be redirected in a few seconds.</b>
                    </p>
                    <p>
                        <a href={goalUrl}>Click here to open the license agreement directly.</a>
                    </p>
                    <meta httpEquiv="Refresh" content={'1; url=' + goalUrl} />
                </div>
            </main>
        </Layout >
    );
}
