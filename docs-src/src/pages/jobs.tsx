import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import React, { useEffect, useState } from 'react';

const FILE_EVENT_ID = 'jobs-link-clicked';

import { triggerTrackingEvent } from '../components/trigger-event';
import { IframeFormModal, Modal } from '../components/modal';
import { Button } from '../components/button';
import { JOBS_TITLE } from '../constants';

/**
 * The conditions are identical for both positions, so they live in one place
 * and are rendered into each advert. Each advert has to stand on its own,
 * because a visitor reads one of them and never the other.
 */
const CONDITIONS = [
    '20 € pro Stunde',
    '10 bis 20 Stunden pro Woche, flexibel nach Vorlesungsplan',
    'regelmäßig vor Ort in Stuttgart, zeitweise auch aus dem Homeoffice',
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
        /**
         * Each position has its own Pipedrive webform, so an application
         * arrives already assigned to a position and the form does not have
         * to ask which one it is for.
         */
        formUrl: 'https://webforms.pipedrive.com/f/czK0WxW1wnP2HOdt6VkTVENuSfO4WvZsVeFXTCAy1a6wazfJcSa0BHBiWNoj1YKZTZ',
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
        formUrl: 'https://webforms.pipedrive.com/f/6ULD69TOWMqORnAypjPo1bdwhsesN2fDV6KxV3qLLYIPaJhOP8rNnznmTTk7Pojq39',
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
    // which position's form to show, kept after closing so the modal can fade out
    const [formJob, setFormJob] = useState<number | null>(null);
    const [formOpen, setFormOpen] = useState(false);

    const showJob = (index: number) => {
        setOpenJob(index);
        triggerTrackingEvent('jobs_detail_open_' + JOBS[index].id, 0.3);
    };

    /**
     * Applying happens from inside an advert. Close that one first so the two
     * modals never stack on top of each other.
     */
    const openApplicationForm = (index: number) => {
        setOpenJob(null);
        setFormJob(index);
        setFormOpen(true);
        triggerTrackingEvent('jobs_form_open_' + JOBS[index].id, 0.5);
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
                title={JOBS_TITLE}
                description="Offene Werkstudentenstellen bei RxDB in Stuttgart, 20 € pro Stunde."
            >
                <main>

                    <div className="block first centered">
                        <div className="content">
                            <h1 style={{ textAlign: 'center' }}>
                                Karriere bei <b>RxDB</b>
                            </h1>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <p className="centered-mobile-p" style={{ maxWidth: 780 }}>
                                    RxDB ist eine Local-First-Datenbank für JavaScript-Anwendungen.
                                    Sie arbeitet weiter, wenn die Netzverbindung ausfällt, und
                                    synchronisiert, sobald sie wiederhergestellt ist. Unternehmen wie
                                    Readwise, Nutrien, MoreApp und myAgro setzen RxDB in Produktion ein.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="block dark" style={{ paddingBottom: 124 }}>
                        <div className="content">
                            {/*
                              * Plain flex row instead of the shared .inner
                              * class, which turns column-reverse on small
                              * screens and would show the second advert first.
                              */}
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                alignItems: 'stretch'
                            }}>
                                {
                                    JOBS.map((entry, i) => {
                                        return <div
                                            key={entry.id}
                                            role='button'
                                            tabIndex={0}
                                            aria-label={'Stellenanzeige öffnen: ' + entry.title}
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
                                                marginBottom: 14
                                            }}>{entry.title}</div>
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
                                                vor Ort in Stuttgart
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
                                    <Button primary onClick={() => {
                                        if (openJob !== null) {
                                            openApplicationForm(openJob);
                                        }
                                    }}>
                                        Jetzt bewerben
                                    </Button>
                                </div>
                            </> : null
                        }
                    </Modal>

                    {
                        formJob === null ? null : <IframeFormModal
                            // remount when the visitor switches position
                            key={JOBS[formJob].id}
                            iframeUrl={JOBS[formJob].formUrl}
                            open={formOpen}
                            onClose={() => setFormOpen(false)}
                            eventId={'jobs_form_' + JOBS[formJob].id}
                            focusEventType={'jobs_form_focus_' + JOBS[formJob].id}
                        />
                    }
                </main>
            </Layout>
        </>
    );
}
