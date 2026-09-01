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
        title: 'Schwerpunkt Frontend-Entwicklung',
        lead: 'Du entwickelst die Anwendungen, an denen Entwickler RxDB zum ersten Mal ausprobieren.',
        tasks: [
            'Entwicklung von Demo-Anwendungen in TypeScript, die den Einsatz von RxDB in React, Angular, Vue und Svelte zeigen',
            'Pflege der bestehenden Beispielprojekte über die Releases hinweg',
            'Prüfung der Dokumentation aus der Perspektive von Erstnutzern und Aufnahme der Schwachstellen',
            'Beantwortung von Entwicklerfragen auf GitHub, Discord und Stack Overflow'
        ],
        requirements: [
            'Studium der Informatik, Softwaretechnik, Medieninformatik oder eines vergleichbaren Fachs',
            'sicherer Umgang mit TypeScript und mindestens einem Frontend-Framework',
            'eigene veröffentlichte Projekte, ein GitHub-Profil ersetzt bei uns das Anschreiben'
        ]
    },
    {
        title: 'Schwerpunkt Video und Social Media',
        lead: 'Du machst die Arbeit sichtbar, die im Frontend-Bereich entsteht.',
        tasks: [
            'Produktion kurzer Videos zur Arbeit mit RxDB, von der Konzeption über Aufnahme und Schnitt bis zu Titel und Thumbnail',
            'Aufbereitung der Videos als Shorts und Reels für YouTube, LinkedIn, Instagram und TikTok',
            'Betreuung des YouTube-Kanals und der Social-Media-Kanäle einschließlich Community-Management',
            'Auswertung der Reichweiten und Ableitung der nächsten Themen'
        ],
        requirements: [
            'Studium der Audiovisuellen Medien, Onlinemedien, Werbung und Marktkommunikation, Medieninformatik oder eines vergleichbaren Fachs',
            'eigenständige Schnittarbeit, belegt durch Arbeitsproben',
            'Grundkenntnisse in der Softwareentwicklung. Du entwickelst nicht selbst, solltest aber verstehen, was in einem Video passiert, und einen Codeausschnitt lesen können.'
        ]
    }
];

function Section(props: { title: string; items: string[]; }) {
    return <>
        <div style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: 0.65,
            marginTop: 20,
            marginBottom: 8
        }}>{props.title}</div>
        <ul style={{ lineHeight: '24px', fontSize: 14, marginBottom: 0 }}>
            {props.items.map((item, i) => <li key={'i-' + i}>{item}</li>)}
        </ul>
    </>;
}

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
                                    Sie arbeitet weiter, wenn die Netzverbindung ausfällt, und
                                    synchronisiert, sobald sie wiederhergestellt ist. Unternehmen wie
                                    Readwise, Nutrien, MoreApp und myAgro setzen RxDB in Produktion ein.
                                </p>
                                <p className="centered-mobile-p" style={{ maxWidth: 780 }}>
                                    Die Developer Experience entscheidet darüber, ob Entwickler nach
                                    der ersten Stunde mit RxDB weiterarbeiten. Für diesen Bereich
                                    besetzen wir <b>zwei Werkstudentenstellen</b>, eine mit Schwerpunkt
                                    Frontend-Entwicklung und eine mit Schwerpunkt Video und Social Media.
                                </p>
                                <p className="centered-mobile-p" style={{ maxWidth: 780 }}>
                                    Konditionen für beide Stellen: <b>20 € pro Stunde</b>, 10 bis 20
                                    Stunden pro Woche, flexibel nach Vorlesungsplan. Überwiegend remote,
                                    gelegentlich vor Ort in Stuttgart. Eintritt nach Absprache.
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
                                                lineHeight: '23px'
                                            }}>{job.lead}</div>

                                            <Section title='Aufgaben' items={job.tasks} />
                                            <Section title='Anforderungen' items={job.requirements} />

                                            <div style={{ flexGrow: 1, minHeight: 28 }}></div>
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
