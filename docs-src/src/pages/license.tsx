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
import { triggerTrackingEvent } from '../components/trigger-event';

const FILE_EVENT_ID = 'premium_license_opened';

export default function LicensePreview() {
    const { siteConfig } = useDocusaurusContext();

    const [goalUrl, setGoalUrl] = useState(null);
    const isBrowser = useIsBrowser();
    useEffect(() => {
        console.log('use effect');
        if (!isBrowser) {
            return;
        }

        (() => {
            try {
                const myParamValue = new URLSearchParams(window.location.search).get('v');
                const value = myParamValue ? parseInt(myParamValue, 10) : 300;
                triggerTrackingEvent(FILE_EVENT_ID, value, 1);
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
