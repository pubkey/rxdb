import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useIsBrowser from '@docusaurus/useIsBrowser';
import Layout from '@theme/Layout';
import React, { useEffect } from 'react';
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
                    100
                );
                await database.upsertLocal(FILE_EVENT_ID, {});
            }
        })();
    });

    return (
        <Layout
            title={`Meeting - ${siteConfig.title}`}
            description="RxDB Meeting Scheduler"
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
                        <a href="https://rxdb.pipedrive.com/scheduler/Z6A0M1sr/rxdb-1h-paid-consulting-session">Click here</a>
                    </p>
                    <meta httpEquiv="Refresh" content="0; url=https://rxdb.pipedrive.com/scheduler/Z6A0M1sr/rxdb-1h-paid-consulting-session" />
                </div>
            </main>
        </Layout >
    );
}

