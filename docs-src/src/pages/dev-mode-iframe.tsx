import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useIsBrowser from '@docusaurus/useIsBrowser';
import Layout from '@theme/Layout';
import React, { useEffect } from 'react';
import { getDatabase, hasIndexedDB } from '../components/database';
const EVENT_ID = 'dev_mode_tracking_iframe';

export default function ServiceSubmitted() {
    const { siteConfig } = useDocusaurusContext();

    const isBrowser = useIsBrowser();
    useEffect(() => {
        if (!isBrowser || !hasIndexedDB()) {
            return;
        }
        (async () => {
            const database = await getDatabase();
            const flagDoc = await database.getLocal(EVENT_ID);
            if (flagDoc) {
                console.log('# already tracked ' + EVENT_ID);
            } else {
                window.trigger(
                    EVENT_ID,
                    10
                );
                await database.upsertLocal(EVENT_ID, {});
            }
        })();
    });

    return (
        <Layout
            title={`Dev Mode Tracking Iframe - ${siteConfig.title}`}
            description="RxDB Meeting Scheduler"
        >
            <main>
                <br />
                <br />
                <br />
                <br />
            </main >
        </Layout >
    );
}

