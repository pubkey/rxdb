import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import React, { useEffect, useState } from 'react';

const FILE_EVENT_ID = 'jobs-link-clicked';

import { triggerTrackingEvent } from '../components/trigger-event';
import { IframeFormModal } from '../components/modal';
import { Button } from '../components/button';

/**
 * Pipedrive webform for job applications.
 * TODO replace with the real form url once the form exists in Pipedrive,
 * the required fields are listed in the pull request that added this page.
 */
const JOBS_FORM_IFRAME_URL = 'https://webforms.pipedrive.com/f/REPLACE_ME';

/**
 * This page is in German on purpose. The position is a German Werkstudenten
 * job in Stuttgart and the people it is written for study here, so the page
 * sets its own lang attribute instead of inheriting the site default.
 */
const TASKS = [
    {
        title: 'Demo-Anwendungen bauen',
        text: 'Jedes RxDB-Feature braucht ein lauffähiges Beispiel. Du baust kleine Anwendungen in TypeScript, die RxDB in React, Angular, Vue und React Native zeigen, und hältst die bestehenden Beispiele zur jeweils neuesten Version aktuell.'
    },
    {
        title: 'Die passende Seite dazu schreiben',
        text: 'Eine Demo, die niemand findet, hilft niemandem. Zu jedem Beispiel entsteht eine Doku- oder Blogseite, die erklärt, was es tut und warum es so gebaut ist.'
    },
    {
        title: 'Entwicklerfragen beantworten',
        text: 'Fragen zu RxDB kommen über GitHub Discussions, Discord und Stack Overflow herein. Du beantwortest die, die du kannst, und gibst die anderen weiter.'
    },
    {
        title: 'Die Beispiele ehrlich halten',
        text: 'Wenn ein Release eine API ändert, gehen die Beispiele kaputt. Du merkst das vor unseren Nutzern.'
    }
];

const CUSTOMERS = [
    { name: 'Readwise', country: 'USA' },
    { name: 'Nutrien', country: 'Kanada' },
    { name: 'SafeEx', country: 'Dänemark' },
    { name: 'MoreApp', country: 'Deutschland' },
    { name: 'myAgro', country: 'Afrika' },
    { name: 'WooCommerce POS', country: 'Australien' },
    { name: 'atroo GmbH', country: 'Deutschland' },
    { name: 'WebWare', country: 'Italien' },
    { name: 'ALTGRAS', country: 'Guinea' }
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
                description="Offene Stellen bei RxDB. Wir suchen einen Werkstudenten für Developer Content in Stuttgart, überwiegend remote."
            >
                <main>

                    <div className="block first centered">
                        <div className="content">
                            <h1 style={{ textAlign: 'center' }}>
                                Arbeite an <b>RxDB</b>
                            </h1>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <p className="centered-mobile-p">
                                    RxDB ist eine Local-First-Datenbank für JavaScript-Anwendungen.
                                    Sie läuft im Browser, auf dem Handy und auf dem Server, sie
                                    funktioniert weiter, wenn das Netz ausfällt, und sie synchronisiert,
                                    sobald die Verbindung zurück ist. Unternehmen bauen darauf ihre
                                    Außendienst-Apps, ihre Offline-Werkzeuge und ihre Produkte.
                                </p>
                                <p className="centered-mobile-p">
                                    Wir haben eine offene Stelle.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="block dark">
                        <div className="content">
                            <h2 style={{ textAlign: 'center' }}>
                                Werkstudent (m/w/d) <b>Developer Content</b>
                            </h2>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <p className="centered-mobile-p">
                                    <b>20 € pro Stunde</b>, 10 bis 20 Stunden pro Woche, flexibel nach
                                    deinem Vorlesungsplan. Überwiegend remote, gelegentlich vor Ort in
                                    Stuttgart. Start nach Absprache, auch mitten im Semester.
                                </p>
                                <p className="centered-mobile-p">
                                    Für eine Werkstudentenstelle musst du eingeschrieben sein.
                                    Informatik, Softwaretechnik, Medieninformatik oder etwas
                                    Vergleichbares.
                                </p>
                                <div className="text-center-mobile">
                                    <Button primary onClick={openApplicationForm}>Jetzt bewerben</Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="block">
                        <div className="content">
                            <h2 style={{ textAlign: 'center' }}>Deine <b>Aufgaben</b></h2>
                            <div className="inner" style={{ flexWrap: 'wrap' }}>
                                {
                                    TASKS.map((task, i) => {
                                        return <div
                                            key={'task-' + i}
                                            style={{
                                                // the plain .block background is
                                                // var(--bg-color), so a card has to
                                                // use the darker tone to be visible
                                                backgroundColor: 'var(--bg-color-dark)',
                                                borderRadius: 10,
                                                padding: 24,
                                                margin: 8,
                                                flex: '1 1 380px'
                                            }}
                                        >
                                            <div style={{
                                                fontSize: 16,
                                                fontWeight: 700,
                                                lineHeight: '25px',
                                                marginBottom: 12
                                            }}>{task.title}</div>
                                            <div style={{
                                                fontSize: 14,
                                                fontWeight: 500,
                                                lineHeight: '21px'
                                            }}>{task.text}</div>
                                        </div>;
                                    })
                                }
                            </div>
                        </div>
                    </div>

                    <div className="block dark">
                        <div className="content">
                            <h2 style={{ textAlign: 'center' }}>Dein <b>Profil</b></h2>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <ul style={{ maxWidth: 720, lineHeight: '28px' }}>
                                    <li>Du bist sicher in TypeScript.</li>
                                    <li>
                                        Du hast schon etwas Eigenes veröffentlicht, ein Nebenprojekt,
                                        eine Library, eine App oder einen Pull Request in einem fremden
                                        Repository. Ein GitHub-Profil sagt uns mehr als ein Anschreiben,
                                        schick uns also das.
                                    </li>
                                    <li>
                                        Du kannst eine technische Sache schriftlich erklären. Die Hälfte
                                        dieses Jobs ist Code, die andere Hälfte ist der Text daneben.
                                    </li>
                                    <li>Deutsch oder Englisch, beides geht.</li>
                                </ul>
                                <p className="centered-mobile-p">
                                    RxDB musst du noch nicht kennen. Das kennt vorher niemand.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="block">
                        <div className="content">
                            <h2 style={{ textAlign: 'center' }}>Wer <b>nutzt</b>, was du baust</h2>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <p className="centered-mobile-p">
                                    RxDB läuft produktiv bei Unternehmen auf vier Kontinenten. Die
                                    Beispiele, die du schreibst, sind das Erste, was deren Entwickler lesen.
                                </p>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    maxWidth: 860
                                }}>
                                    {
                                        CUSTOMERS.map((customer, i) => {
                                            return <div
                                                key={'customer-' + i}
                                                style={{
                                                    backgroundColor: 'var(--bg-color-dark)',
                                                    borderRadius: 10,
                                                    padding: '12px 20px',
                                                    margin: 6,
                                                    fontSize: 15,
                                                    fontWeight: 600
                                                }}
                                            >
                                                {customer.name}
                                                <span style={{
                                                    fontWeight: 400,
                                                    opacity: 0.7,
                                                    marginLeft: 8
                                                }}>{customer.country}</span>
                                            </div>;
                                        })
                                    }
                                </div>
                                <p className="centered-mobile-p" style={{ marginTop: 24 }}>
                                    MongoDB und Supabase sind offizielle RxDB-Partner. Was die Firmen
                                    oben über RxDB sagen, steht im <a href="/#reviews">Kundenbereich</a> der
                                    Startseite.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="block dark">
                        <div className="content">
                            <h2 style={{ textAlign: 'center' }}>Was wir <b>bieten</b></h2>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <ul style={{ maxWidth: 720, lineHeight: '28px' }}>
                                    <li>20 € pro Stunde.</li>
                                    <li>10 bis 20 Stunden pro Woche, geplant um deine Vorlesungen und deine Klausuren herum.</li>
                                    <li>Überwiegend remote, gelegentlich gemeinsame Tage in Stuttgart.</li>
                                    <li>
                                        Deine Arbeit ist öffentlich und trägt deinen Namen. RxDB ist Open
                                        Source unter der Apache License 2.0, jedes Beispiel und jede
                                        Seite von dir bleibt also sichtbar, auch wenn du längst weg bist.
                                    </li>
                                    <li>
                                        Kurze Wege. Du sprichst mit den Leuten, die das Produkt bauen,
                                        denn das sind hier alle.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="block centered" style={{ paddingBottom: 124 }}>
                        <div className="content">
                            <h2 style={{ textAlign: 'center' }}>So <b>bewirbst</b> du dich</h2>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <p className="centered-mobile-p">
                                    Schick uns einen Link auf dein GitHub-Profil und zwei Sätze dazu, was
                                    du dort gebaut hast. Kein Anschreiben, kein Foto, keine Noten.
                                    Wir antworten auf jede Bewerbung.
                                </p>
                                <Button primary onClick={openApplicationForm}>Jetzt bewerben</Button>
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
