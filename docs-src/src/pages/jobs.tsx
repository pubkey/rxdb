import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import React, { useEffect, useState } from 'react';

const FILE_EVENT_ID = 'jobs-link-clicked';

import { triggerTrackingEvent } from '../components/trigger-event';
import { IframeFormModal } from '../components/modal';
import { Button } from '../components/button';

/**
 * Pipedrive webform for job applications. Both positions use the same form,
 * the applicant picks the position inside it.
 */
const JOBS_FORM_IFRAME_URL = 'https://webforms.pipedrive.com/f/czK0WxW1wnP2HOdt6VkTVENuSfO4WvZsVeFXTCAy1a6wazfJcSa0BHBiWNoj1YKZTZ';

/**
 * This page is in German on purpose. Both positions are German
 * Werkstudenten jobs in Stuttgart, so the page sets its own lang
 * attribute instead of inheriting the site default.
 */
const JOBS = [
    {
        title: 'Werkstudent (m/w/d) Developer Content',
        bullets: [
            'Demo-Anwendungen in TypeScript bauen, die RxDB in React, Angular und Vue zeigen',
            'die bestehenden Beispiele zu jedem Release aktuell halten',
            'zu jeder Demo die passende Doku- oder Blogseite schreiben',
            'Entwicklerfragen auf GitHub, Discord und Stack Overflow beantworten'
        ],
        profile: 'Informatik, Softwaretechnik oder Medieninformatik. Du bist sicher in TypeScript und hast schon etwas Eigenes veröffentlicht. Ein GitHub-Profil sagt uns mehr als ein Anschreiben.'
    },
    {
        title: 'Werkstudent (m/w/d) Video und Content',
        bullets: [
            'unseren YouTube-Kanal übernehmen, von der Aufnahme über den Schnitt bis zu Titel und Thumbnail',
            'aus jedem langen Video Shorts und einen LinkedIn-Clip schneiden',
            'kurze Animationen, die Offline-First und Synchronisation erklären',
            'Kommentare, Playlists und Kanalpflege'
        ],
        profile: 'Audiovisuelle Medien, Medieninformatik oder Werbung und Marktkommunikation. Wir wollen kein Anschreiben, sondern zwei bis drei Sachen, die du geschnitten hast.'
    }
];

export default function Jobs() {
    useEffect(() => {
        (() => {
            triggerTrackingEvent(FILE_EVENT_ID, 0.5);
        })();
    });

    const [openForm, setOpenForm] = useState(false);

    const openApplicationForm = () => {
        setOpenForm(true);
        triggerTrackingEvent('jobs_form_open', 0.5);
    };

    return (
        <>
            <Head>
                <html lang="de" />
                <body className="homepage jobs-page" />
                <link rel="canonical" href="/jobs/" />
            </Head>
            <Layout
                title={'Jobs'}
                description="Offene Stellen bei RxDB. Zwei Werkstudentenstellen in Stuttgart, überwiegend remote, 20 € pro Stunde."
            >
                <main>

                    <div className="block first centered">
                        <div className="content">
                            <h1 style={{ textAlign: 'center' }}>
                                Arbeite an <b>RxDB</b>
                            </h1>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <p className="centered-mobile-p" style={{ maxWidth: 760 }}>
                                    RxDB ist eine Local-First-Datenbank für JavaScript-Anwendungen.
                                    Sie funktioniert weiter, wenn das Netz ausfällt, und synchronisiert,
                                    sobald die Verbindung zurück ist. Im Einsatz ist sie unter anderem
                                    bei Readwise, Nutrien, MoreApp und myAgro.
                                </p>
                                <p className="centered-mobile-p">
                                    <b>Zwei offene Stellen</b>, beide 20 € pro Stunde, 10 bis 20 Stunden
                                    pro Woche, flexibel nach Vorlesungsplan. Überwiegend remote,
                                    gelegentlich vor Ort in Stuttgart. Start nach Absprache.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="block dark" style={{ paddingBottom: 124 }}>
                        <div className="content">
                            <div className="inner" style={{ flexWrap: 'wrap', alignItems: 'stretch' }}>
                                {
                                    JOBS.map((job, i) => {
                                        return <div
                                            key={'job-' + i}
                                            style={{
                                                backgroundColor: 'var(--bg-color)',
                                                borderRadius: 10,
                                                padding: 32,
                                                margin: 8,
                                                flex: '1 1 420px',
                                                display: 'flex',
                                                flexDirection: 'column'
                                            }}
                                        >
                                            <div style={{
                                                fontSize: 20,
                                                fontWeight: 700,
                                                lineHeight: '28px',
                                                marginBottom: 20
                                            }}>{job.title}</div>
                                            <ul style={{ lineHeight: '24px', fontSize: 14 }}>
                                                {job.bullets.map((b, j) => <li key={'b-' + j}>{b}</li>)}
                                            </ul>
                                            <div style={{
                                                fontSize: 14,
                                                lineHeight: '21px',
                                                opacity: 0.8,
                                                marginTop: 12,
                                                marginBottom: 28,
                                                flexGrow: 1
                                            }}>{job.profile}</div>
                                            <div style={{ textAlign: 'center' }}>
                                                <Button primary onClick={openApplicationForm}>
                                                    Jetzt bewerben
                                                </Button>
                                            </div>
                                        </div>;
                                    })
                                }
                            </div>
                        </div>
                    </div>

                    <IframeFormModal
                        iframeUrl={JOBS_FORM_IFRAME_URL}
                        open={openForm}
                        onClose={() => setOpenForm(false)}
                        eventId='jobs_form'
                        focusEventType='jobs_form_focus'
                    />
                </main>
            </Layout>
        </>
    );
}
