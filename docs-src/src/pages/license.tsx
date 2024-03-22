/**
 * We use pipedrive as a sales tool.
 * However sharing pipedrive url directly in emails
 * has shown to increase the likelihood of landing in spam filters.
 * Therefore just use a rxdb.info link that redirects to pipedrive.
 * This also allows to track the conversion event.
 */
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React, { useEffect, useState } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { getDatabase, hasIndexedDB } from '../components/database';

const FILE_EVENT_ID = 'premium_license_opened';

export default function LicensePreview() {
    const { siteConfig } = useDocusaurusContext();

    const [goalUrl, setGoalUrl] = useState(null);
    const isBrowser = useIsBrowser();
    useEffect(() => {
        console.log('use effect');
        if (!isBrowser || !hasIndexedDB()) {
            return;
        }

        (async () => {
            try {
                const database = await getDatabase();
                const flagDoc = await database.getLocal(FILE_EVENT_ID);
                if (flagDoc) {
                    console.log('# file opening already tracked');
                } else {
                    const myParamValue = new URLSearchParams(window.location.search).get('v');
                    const value = myParamValue ? parseInt(myParamValue, 10) : 300;
                    window.trigger(
                        FILE_EVENT_ID,
                        Math.floor(value / 3) // assume lead-to-sale-rate is 33%.
                    );
                    await database.upsertLocal(FILE_EVENT_ID, {});
                }
            } catch (err) {
                console.log(err);
            }

            const myParamFileCode = new URLSearchParams(window.location.search).get('f');
            const newUrl = 'https://rxdb.pipedrive.com/documents/p/' + myParamFileCode;
            if (goalUrl !== newUrl) {
                setGoalUrl(newUrl);
                setTimeout(() => window.location.href = newUrl, 1000);
            }
        })();
    });

    return (
        <Layout
            title={`License Preview - ${siteConfig.title}`}
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
                    {!!goalUrl && <>
                        <p>
                            <a href={goalUrl}>Click here to open the license agreement directly.</a>
                        </p>
                    </>}
                </div>
            </main>
        </Layout >
    );
}
