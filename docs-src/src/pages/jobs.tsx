import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import React, { useEffect, useState } from 'react';

const FILE_EVENT_ID = 'jobs-link-clicked';

import { triggerTrackingEvent } from '../components/trigger-event';
import { IframeFormModal, Modal } from '../components/modal';
import { Button } from '../components/button';

/**
 * Pipedrive webform for job applications. Both positions use the same form,
 * the applicant picks the position inside it.
 */
const JOBS_FORM_IFRAME_URL = 'https://webforms.pipedrive.com/f/czK0WxW1wnP2HOdt6VkTVENuSfO4WvZsVeFXTCAy1a6wazfJcSa0BHBiWNoj1YKZTZ';

/**
 * The conditions are identical for both positions, so they live in one place
 * and are rendered into each advert. Each advert has to stand on its own,
 * because a visitor reads one of them and never the other.
 */
const CONDITIONS = [
    '20 € pro Stunde',
    '10 bis 20 Stunden pro Woche, flexibel nach Vorlesungsplan',
    'überwiegend remote, gelegentlich vor Ort in Stuttgart',
    'Eintritt nach Absprache, auch mitten im Semester',
    'deine Arbeit ist Open Source und bleibt unter deinem Namen sichtbar'
];

/**
 * This page is in German on purpose. Both positions are German
 * Werkstudenten jobs in Stuttgart, so the page sets its own lang
 * attribute instead of inheriting the site default.
 */
const JOBS = [
    {
        id: 'frontend',
        title: 'Werkstudent (m/w/d) Developer Experience, Schwerpunkt Frontend',
        short: 'Schwerpunkt Frontend',
        teaser: 'Du arbeitest an RxDB selbst und daran, dass Entwickler schneller damit zurechtkommen.',
        tasks: [
            'Analyse, woran Entwickler beim Einstieg in RxDB hängen bleiben, und Behebung der Ursachen im Code',
            'Mitarbeit an der öffentlichen Schnittstelle der Bibliothek, damit sie sich vorhersehbar verhält',
            'Verbesserung der Rückmeldungen, die RxDB im Fehlerfall gibt',
            'Rückführung wiederkehrender Fragen aus der Community in Produkt und Dokumentation'
        ],
        requirements: [
            'Studium der Informatik, Softwaretechnik, Medieninformatik oder eines vergleichbaren Fachs',
            'sicherer Umgang mit TypeScript, Erfahrung mit einem Frontend-Framework ist von Vorteil',
            'eigene veröffentlichte Projekte, ein GitHub-Profil ersetzt bei uns das Anschreiben'
        ]
    },
    {
        id: 'video',
        title: 'Werkstudent (m/w/d) Developer Experience, Schwerpunkt Video und Social Media',
        short: 'Schwerpunkt Video und Social Media',
        teaser: 'Du machst die Arbeit sichtbar, die im Frontend-Bereich entsteht.',
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
            marginTop: 24,
            marginBottom: 8
        }}>{props.title}</div>
        <ul style={{ lineHeight: '24px', fontSize: 14, fontWeight: 500, marginBottom: 0 }}>
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

    const [openJob, setOpenJob] = useState<number | null>(null);
    const [openForm, setOpenForm] = useState(false);

    const showJob = (index: number) => {
        setOpenJob(index);
        triggerTrackingEvent('jobs_detail_open_' + JOBS[index].id, 0.3);
    };

    /**
     * Applying happens from inside an advert. Close that one first so the two
     * modals never stack on top of each other.
     */
    const openApplicationForm = () => {
        setOpenJob(null);
        setOpenForm(true);
        triggerTrackingEvent('jobs_form_open', 0.5);
    };

    const job = openJob === null ? null : JOBS[openJob];

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
                                Arbeite an <b>RxDB</b>
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
                                    besetzen wir <b>zwei Werkstudentenstellen</b>. Klick auf eine
                                    Stelle für die vollständige Anzeige.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="block dark" style={{ paddingBottom: 124 }}>
                        <div className="content">
                            <div className="inner" style={{ flexWrap: 'wrap', alignItems: 'stretch' }}>
                                {
                                    JOBS.map((entry, i) => {
                                        return <div
                                            key={entry.id}
                                            role='button'
                                            tabIndex={0}
                                            aria-label={'Stellenanzeige öffnen: ' + entry.short}
                                            onClick={() => showJob(i)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    showJob(i);
                                                }
                                            }}
                                            style={{
                                                backgroundColor: 'var(--bg-color)',
                                                borderRadius: 10,
                                                padding: 32,
                                                margin: 8,
                                                flex: '1 1 420px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{
                                                fontSize: 20,
                                                fontWeight: 700,
                                                lineHeight: '28px',
                                                marginBottom: 10
                                            }}>{entry.short}</div>
                                            <div style={{
                                                fontSize: 15,
                                                lineHeight: '23px',
                                                marginBottom: 20
                                            }}>{entry.teaser}</div>
                                            <div style={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                                opacity: 0.7,
                                                flexGrow: 1
                                            }}>
                                                20 € pro Stunde, 10 bis 20 Stunden pro Woche,
                                                Stuttgart und remote
                                            </div>
                                            <div style={{ textAlign: 'center', marginTop: 28 }}>
                                                <Button primary onClick={(event) => {
                                                    // the whole tile is clickable, so the
                                                    // button must not trigger it a second time
                                                    event.stopPropagation();
                                                    showJob(i);
                                                }}>
                                                    Zur Stellenanzeige
                                                </Button>
                                            </div>
                                        </div>;
                                    })
                                }
                            </div>
                        </div>
                    </div>

                    <Modal
                        open={job !== null}
                        onCancel={() => setOpenJob(null)}
                        title={job ? job.title : ''}
                    >
                        {
                            job ? <>
                                {/*
                                  * The advert scrolls, the button does not. Keeping the
                                  * button out of the scroll container stops the browser
                                  * from scrolling the advert to the bottom when the modal
                                  * is opened by keyboard and focus lands on the button.
                                  */}
                                <div style={{
                                    padding: '0 20px',
                                    maxHeight: '60vh',
                                    overflowY: 'auto'
                                }}>
                                    <div style={{ fontSize: 15, lineHeight: '23px' }}>{job.teaser}</div>
                                    <Section title='Aufgaben' items={job.tasks} />
                                    <Section title='Anforderungen' items={job.requirements} />
                                    <Section title='Konditionen' items={CONDITIONS} />
                                </div>
                                <div style={{
                                    textAlign: 'center',
                                    padding: '20px 20px 4px 20px'
                                }}>
                                    <Button primary onClick={openApplicationForm}>
                                        Jetzt bewerben
                                    </Button>
                                </div>
                            </> : null
                        }
                    </Modal>

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
