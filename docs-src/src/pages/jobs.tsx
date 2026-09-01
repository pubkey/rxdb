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
        title: 'Schwerpunkt Frontend',
        lead: 'Du baust die Anwendungen, an denen Entwickler RxDB zum ersten Mal ausprobieren.',
        bullets: [
            'Demo-Apps in TypeScript bauen, die RxDB in React, Angular, Vue und Svelte zeigen',
            'die bestehenden Beispiele zu jedem Release aktuell halten',
            'die Doku aus der Sicht von jemandem lesen, der RxDB zum ersten Mal benutzt, und aufschreiben, wo es hakt',
            'Entwicklerfragen auf GitHub, Discord und Stack Overflow beantworten'
        ],
        profile: 'Informatik, Softwaretechnik, Medieninformatik oder etwas Vergleichbares. Du kannst TypeScript und mindestens ein Frontend-Framework, und du hast schon etwas Eigenes veröffentlicht. Ein GitHub-Profil sagt uns mehr als ein Anschreiben.'
    },
    {
        title: 'Schwerpunkt Video und Social Media',
        lead: 'Du machst sichtbar, was die Entwicklerin oder der Entwickler nebenan gebaut hat.',
        bullets: [
            'kurze Videos produzieren, die zeigen, wie man mit RxDB etwas baut, von der Idee über Aufnahme und Schnitt bis zu Titel und Thumbnail',
            'daraus Shorts und Reels für YouTube, LinkedIn, Instagram und TikTok schneiden',
            'unseren YouTube-Kanal und die Social-Accounts betreuen, Kommentare eingeschlossen',
            'anschauen, was funktioniert hat, und die nächsten Videos danach ausrichten'
        ],
        profile: 'Audiovisuelle Medien, Onlinemedien, Werbung und Marktkommunikation, Medieninformatik oder etwas Vergleichbares. Du schneidest selbst und hast Sachen, die man sich ansehen kann. Programmieren musst du nicht können.'
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
                description="Zwei Werkstudentenstellen für Developer Experience bei RxDB. Stuttgart, überwiegend remote, 20 € pro Stunde."
            >
                <main>

                    <div className="block first centered">
                        <div className="content">
                            <h1 style={{ textAlign: 'center' }}>
                                Werkstudent (m/w/d) für <b>Developer Experience</b>
                            </h1>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <p className="centered-mobile-p" style={{ maxWidth: 780 }}>
                                    RxDB ist eine Local-First-Datenbank für JavaScript-Anwendungen.
                                    Sie funktioniert weiter, wenn das Netz ausfällt, und synchronisiert,
                                    sobald die Verbindung zurück ist. Im Einsatz ist sie unter anderem
                                    bei Readwise, Nutrien, MoreApp und myAgro.
                                </p>
                                <p className="centered-mobile-p" style={{ maxWidth: 780 }}>
                                    Developer Experience heißt bei uns: die erste Stunde mit RxDB
                                    entscheidet, ob jemand dabei bleibt. Daran arbeiten wir, und dafür
                                    suchen wir <b>zwei Leute</b>. Eine Person baut, die andere zeigt es.
                                </p>
                                <p className="centered-mobile-p">
                                    Beide Stellen: <b>20 € pro Stunde</b>, 10 bis 20 Stunden pro Woche,
                                    flexibel nach Vorlesungsplan. Überwiegend remote, gelegentlich vor
                                    Ort in Stuttgart. Start nach Absprache.
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
                                                marginBottom: 10
                                            }}>{job.title}</div>
                                            <div style={{
                                                fontSize: 15,
                                                lineHeight: '23px',
                                                marginBottom: 20
                                            }}>{job.lead}</div>
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
