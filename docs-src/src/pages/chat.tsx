import Layout from '@theme/Layout';
import React, { useEffect } from 'react';
import { triggerTrackingEvent } from '../components/trigger-event';

export const DISCORD_INVITE_URL = 'https://discord.gg/AdqM4ckqVF';

export default function Chat() {

    useEffect(() => {
        triggerTrackingEvent('join_chat', 0.40);
        /**
         * Replace the history entry instead of pushing one,
         * so that going back from discord does not
         * run the redirect again.
         */
        window.location.replace(DISCORD_INVITE_URL);
    });

    return (
        <Layout
            title={'Chat'}
            description="RxDB Community Chat"
        >
            <main>
                <div className='redirectBox' style={{ textAlign: 'center' }}>
                    <a href="/">
                        <div className="logo">
                            <img src="/files/logo/logo_text.svg" alt="RxDB" width={160} />
                        </div>
                    </a>
                    <h1>💬 RxDB Chat</h1>
                    <p>
                        <b>You will be redirected in a few seconds.</b>
                    </p>
                    <p>
                        <a href={DISCORD_INVITE_URL}>Click here to open Chat</a>
                    </p>
                    <meta httpEquiv="Refresh" content={'1; url=' + DISCORD_INVITE_URL} />
                </div>
            </main>
        </Layout >
    );
}
