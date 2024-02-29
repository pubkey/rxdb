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

const FILE_EVENT_ID = 'meeting-link-clicked';

export default function Meeting() {
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
                console.log('# already tracked ' + FILE_EVENT_ID);
            } else {
                window.trigger(
                    FILE_EVENT_ID,
                    10
                );
                await database.upsertLocal(FILE_EVENT_ID, {});
            }
        })();
    });


    let goalUrl = 'https://rxdb.pipedrive.com/scheduler/';
    if (isBrowser) {
        const myParam = new URLSearchParams(window.location.search).get('f');
        goalUrl += myParam + '/schedulr';
    }

    return (
        <Layout
            title={`Chat - ${siteConfig.title}`}
            description="Meeting Scheduler"
        >
            <main>
                <div className='redirectBox' style={{ textAlign: 'center' }}>
                    <a href="/">
                        <div className="logo">
                            <img src="/files/logo/logo_text.svg" alt="RxDB" width={160} />
                        </div>
                    </a>
                    <h1>RxDB Meeting Scheduler</h1>
                    <p>
                        <b>You will be redirected in a few seconds.</b>
                    </p>
                    <p>
                        <a href={goalUrl}>Click here to open the meeting scheduler directly.</a>
                    </p>
                    <meta httpEquiv="Refresh" content={'0; url=' + goalUrl} />
                </div>
            </main>
        </Layout >
    );
}
