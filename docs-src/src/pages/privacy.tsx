import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Head from '@docusaurus/Head';
import Layout from '@theme/Layout';
import React from 'react';

export default function Privacy() {
    const { siteConfig } = useDocusaurusContext();
    return (
        <>
            <Head>
                <meta name="robots" content="noindex, nofollow"></meta>
            </Head>
            <Layout
                title={`Datenschutzerklärung / Privacy Policy - ${siteConfig.title}`}
                description="RxDB Datenschutzerklärung / Privacy Policy"
            >
                <main>
                    <div className='redirectBox' style={{ textAlign: 'center' }}>
                        <a href="/">
                            <div className="logo">
                                <img src="/files/logo/logo_text.svg" alt="RxDB" width={160} />
                            </div>
                        </a>
                        <h1><a href="https://rxdb.info/">RxDB</a> Datenschutzerklärung</h1>
                    </div>

                    {/* ==================== GERMAN VERSION ==================== */}
                    <div className='redirectBox' style={{ padding: '10%' }}>
                        <h2>Datenschutzerklärung</h2>
                        <p>
                            Diese Datenschutzerklärung informiert Sie über Art, Umfang und Zweck der
                            Verarbeitung personenbezogener Daten beim Besuch der Website
                            <a href="https://rxdb.info/"> rxdb.info</a> (nachfolgend &bdquo;Website&ldquo;).
                            Personenbezogene Daten sind alle Daten, die auf Sie persönlich beziehbar sind,
                            zum Beispiel Name, Adresse, E-Mail-Adresse oder Ihr Nutzerverhalten.
                        </p>

                        <h3>1. Verantwortlicher</h3>
                        <p>
                            Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
                        </p>
                        <p>
                            Daniel Meyer - RxDB<br />
                            Friedrichstraße 13<br />
                            70174 Stuttgart<br />
                            Deutschland<br />
                            E-Mail: <br />
                            <img src="/files/imprint-email.png" alt="RxDB E-Mail" />
                        </p>
                        <p>
                            Weitere Angaben finden Sie im <a href="/legal-notice/">Impressum</a>.
                        </p>

                        <h3>2. Hosting und Server-Logfiles</h3>
                        <p>
                            Die Website wird als statische Website über <b>GitHub Pages</b> bereitgestellt,
                            einen Dienst der GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107,
                            USA (ein Unternehmen der Microsoft Corporation). Beim Aufruf der Website
                            verarbeitet der Hosting-Anbieter technisch notwendige Zugriffsdaten, die Ihr
                            Browser automatisch übermittelt, insbesondere:
                        </p>
                        <ul style={{ textAlign: 'left' }}>
                            <li>Ihre IP-Adresse</li>
                            <li>Datum und Uhrzeit des Zugriffs</li>
                            <li>die aufgerufene Seite / Datei</li>
                            <li>Referrer-URL (die zuvor besuchte Seite)</li>
                            <li>verwendeter Browser und Betriebssystem</li>
                        </ul>
                        <p>
                            Diese Daten werden zur Auslieferung der Website, zur Gewährleistung der
                            Sicherheit und Stabilität sowie zur technischen Fehleranalyse verarbeitet.
                            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
                            einer sicheren und funktionsfähigen Bereitstellung der Website). Da der
                            Anbieter Daten auch in den USA verarbeiten kann, erfolgt eine Übermittlung
                            in ein Drittland; die Absicherung erfolgt über die
                            Standardvertragsklauseln der EU-Kommission bzw. das
                            EU-U.S. Data Privacy Framework.
                        </p>

                        <h3>3. Cookies und lokale Speicherung</h3>
                        <p>
                            Für den technischen Betrieb der Website werden Informationen im lokalen
                            Speicher (Local Storage) Ihres Browsers abgelegt, zum Beispiel um
                            Anzeige-Einstellungen zu speichern und um zu begrenzen, wie oft bestimmte
                            Hinweise oder Statistik-Ereignisse ausgelöst werden. Diese Speicherung
                            erfolgt lokal in Ihrem Browser. Zusätzlich können die unten genannten
                            Analyse- und Marketing-Dienste Cookies setzen. Cookies und Local-Storage-Einträge
                            können Sie jederzeit über die Einstellungen Ihres Browsers löschen.
                        </p>

                        <h3>4. Analyse und Reichweitenmessung</h3>
                        <p>
                            Im Produktivbetrieb werden die folgenden Dienste eingesetzt. Rechtsgrundlage
                            ist, soweit eine Einwilligung eingeholt wird, Art. 6 Abs. 1 lit. a DSGVO in
                            Verbindung mit &sect; 25 Abs. 1 TTDSG; andernfalls unser berechtigtes Interesse
                            an der statistischen Auswertung und Verbesserung der Website nach
                            Art. 6 Abs. 1 lit. f DSGVO.
                        </p>

                        <h4>Google Analytics und Google Tag Manager</h4>
                        <p>
                            Die Website nutzt Google Analytics 4 sowie den Google Tag Manager, Dienste der
                            Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. Der Google
                            Tag Manager verwaltet dabei das Einbinden der eingesetzten Skripte. Google
                            Analytics verwendet Cookies und ähnliche Technologien, um die Nutzung der
                            Website auszuwerten (zum Beispiel aufgerufene Seiten, Verweildauer, Scroll-Tiefe
                            und ausgelöste Ereignisse). Die dabei erzeugten Informationen können an Server
                            von Google, auch in den USA, übertragen und dort gespeichert werden. Die
                            Absicherung der Drittlandübermittlung erfolgt über die Standardvertragsklauseln
                            bzw. das EU-U.S. Data Privacy Framework.
                        </p>

                        <h4>Reddit Pixel</h4>
                        <p>
                            Die Website bindet den &bdquo;Reddit Pixel&ldquo; der Reddit, Inc.,
                            1455 Market Street, San Francisco, CA 94103, USA ein. Dabei wird ein Skript von
                            <code> www.redditstatic.com</code> geladen, das den Seitenaufruf und weitere
                            Ereignisse (zum Beispiel Interaktionen) erfasst. Der Reddit Pixel dient der
                            Messung und Optimierung von Werbekampagnen auf Reddit. Auch hier kann eine
                            Verarbeitung in den USA erfolgen.
                        </p>

                        <h3>5. Suchfunktion (Algolia)</h3>
                        <p>
                            Für die Dokumentationssuche wird der Dienst Algolia DocSearch der Algolia SAS,
                            55 Rue d&apos;Amsterdam, 75008 Paris, Frankreich, eingesetzt. Wenn Sie die
                            Suche verwenden, wird Ihre Suchanfrage an Algolia übermittelt, um passende
                            Ergebnisse zurückzugeben. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
                            (berechtigtes Interesse an einer funktionierenden Suchfunktion).
                        </p>

                        <h3>6. Eingebundene Formulare und externe Dienste</h3>
                        <p>
                            Auf einzelnen Seiten (zum Beispiel den Premium- und Beratungsseiten) werden
                            Formulare des Anbieters <b>Pipedrive</b> (Pipedrive OÜ, Mustamäe tee 3a,
                            10615 Tallinn, Estland) als eingebettete Inhalte (iFrame) bereitgestellt. Wenn
                            Sie ein solches Formular aufrufen und ausfüllen, werden die von Ihnen
                            eingegebenen Daten an Pipedrive übertragen und dort zur Bearbeitung Ihrer
                            Anfrage verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
                            (Anbahnung bzw. Erfüllung eines Vertrags) sowie Art. 6 Abs. 1 lit. f DSGVO.
                        </p>
                        <p>
                            Weitere externe Dienste sind über Verlinkungen oder Weiterleitungen eingebunden.
                            Ihre Daten werden erst dann an den jeweiligen Anbieter übertragen, wenn Sie den
                            Link aktiv nutzen. Es gelten dann die Datenschutzbestimmungen des jeweiligen
                            Anbieters:
                        </p>
                        <ul style={{ textAlign: 'left' }}>
                            <li>
                                <b>Newsletter (Mailchimp):</b> Die Newsletter-Seite leitet auf ein
                                Anmeldeformular des Dienstes Mailchimp (The Rocket Science Group LLC,
                                USA) weiter. Eine Anmeldung und die damit verbundene Verarbeitung Ihrer
                                E-Mail-Adresse erfolgt ausschließlich auf Grundlage Ihrer Einwilligung
                                (Art. 6 Abs. 1 lit. a DSGVO), die Sie jederzeit widerrufen können.
                            </li>
                            <li>
                                <b>Zahlungen (Stripe):</b> Für die Buchung von Beratungsleistungen wird auf
                                einen Zahlungslink von Stripe (Stripe, Inc.) weitergeleitet. Die
                                Zahlungsabwicklung erfolgt direkt bei Stripe.
                            </li>
                            <li>
                                <b>Discord:</b> Der Community-Link leitet auf einen Discord-Server
                                (Discord Inc., USA) weiter.
                            </li>
                        </ul>

                        <h3>7. Schriftarten</h3>
                        <p>
                            Die auf der Website verwendeten Schriftarten werden lokal von unserem eigenen
                            Server ausgeliefert. Es besteht dabei keine Verbindung zu Servern Dritter
                            (zum Beispiel Google Fonts), und es werden hierfür keine Daten an Dritte
                            übermittelt.
                        </p>

                        <h3>8. Ihre Rechte als betroffene Person</h3>
                        <p>
                            Ihnen stehen im Rahmen der gesetzlichen Voraussetzungen die folgenden Rechte zu:
                        </p>
                        <ul style={{ textAlign: 'left' }}>
                            <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
                            <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
                            <li>Recht auf Löschung (Art. 17 DSGVO)</li>
                            <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
                            <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
                            <li>Recht auf Widerruf einer erteilten Einwilligung (Art. 7 Abs. 3 DSGVO)</li>
                        </ul>
                        <p>
                            Zur Ausübung Ihrer Rechte genügt eine formlose Mitteilung an den oben genannten
                            Verantwortlichen.
                        </p>

                        <h3>9. Widerspruchsrecht</h3>
                        <p>
                            Soweit die Verarbeitung Ihrer personenbezogenen Daten auf Grundlage berechtigter
                            Interessen nach Art. 6 Abs. 1 lit. f DSGVO erfolgt, haben Sie das Recht, aus
                            Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit Widerspruch
                            gegen diese Verarbeitung einzulegen (Art. 21 DSGVO). Erfolgt die Verarbeitung zu
                            Zwecken der Direktwerbung, haben Sie ein jederzeitiges Widerspruchsrecht ohne
                            Angabe von Gründen.
                        </p>

                        <h3>10. Beschwerderecht bei einer Aufsichtsbehörde</h3>
                        <p>
                            Unbeschadet anderweitiger Rechtsbehelfe haben Sie das Recht, sich bei einer
                            Datenschutz-Aufsichtsbehörde zu beschweren, wenn Sie der Ansicht sind, dass die
                            Verarbeitung Ihrer personenbezogenen Daten gegen die DSGVO verstößt
                            (Art. 77 DSGVO). Zuständige Aufsichtsbehörde ist der Landesbeauftragte für den
                            Datenschutz und die Informationsfreiheit Baden-Württemberg,
                            Lautenschlagerstraße 20, 70173 Stuttgart.
                        </p>

                        <h3>11. Aktualität und Änderung dieser Datenschutzerklärung</h3>
                        <p>
                            Diese Datenschutzerklärung kann angepasst werden, wenn sich die Rechtslage oder
                            die auf der Website eingesetzten Dienste ändern. Es gilt jeweils die auf dieser
                            Seite veröffentlichte Fassung.
                        </p>
                    </div>

                    {/* ==================== ENGLISH VERSION ==================== */}
                    <div className='redirectBox' style={{ padding: '10%' }}>
                        <h2>Privacy Policy</h2>
                        <p>
                            This privacy policy informs you about the nature, scope and purpose of the
                            processing of personal data when you visit the website
                            <a href="https://rxdb.info/"> rxdb.info</a> (the &bdquo;Website&ldquo;). Personal
                            data is any information relating to you personally, for example your name,
                            address, email address or your usage behaviour.
                        </p>

                        <h3>1. Controller</h3>
                        <p>
                            The controller within the meaning of the General Data Protection Regulation
                            (GDPR) is:
                        </p>
                        <p>
                            Daniel Meyer - RxDB<br />
                            Friedrichstraße 13<br />
                            70174 Stuttgart<br />
                            Germany<br />
                            Email: <br />
                            <img src="/files/imprint-email.png" alt="RxDB Email" />
                        </p>
                        <p>
                            Further details can be found in the <a href="/legal-notice/">Legal Notice</a>.
                        </p>

                        <h3>2. Hosting and server log files</h3>
                        <p>
                            The Website is a static site served via <b>GitHub Pages</b>, a service provided
                            by GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA (a
                            company of Microsoft Corporation). When you access the Website, the hosting
                            provider processes technically necessary access data that your browser
                            transmits automatically, in particular your IP address, the date and time of
                            access, the requested page or file, the referrer URL and your browser and
                            operating system. This data is processed to deliver the Website, to ensure its
                            security and stability and for technical error analysis. The legal basis is
                            Art. 6(1)(f) GDPR (legitimate interest in a secure and functional website).
                            Because the provider may process data in the USA, a transfer to a third country
                            takes place; it is safeguarded by the EU Standard Contractual Clauses and/or the
                            EU-U.S. Data Privacy Framework.
                        </p>

                        <h3>3. Cookies and local storage</h3>
                        <p>
                            For the technical operation of the Website, information is stored in your
                            browser&apos;s local storage, for example to remember display settings and to
                            limit how often certain notices or statistics events are triggered. This storage
                            happens locally in your browser. In addition, the analytics and marketing
                            services listed below may set cookies. You can delete cookies and local storage
                            entries at any time via your browser settings.
                        </p>

                        <h3>4. Analytics and reach measurement</h3>
                        <p>
                            The following services are used in production. Where consent is obtained, the
                            legal basis is Art. 6(1)(a) GDPR in conjunction with Section 25(1) TTDSG;
                            otherwise our legitimate interest in the statistical analysis and improvement of
                            the Website under Art. 6(1)(f) GDPR.
                        </p>

                        <h4>Google Analytics and Google Tag Manager</h4>
                        <p>
                            The Website uses Google Analytics 4 and Google Tag Manager, services provided by
                            Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland. Google
                            Tag Manager manages the inclusion of the scripts used. Google Analytics uses
                            cookies and similar technologies to analyse the use of the Website (for example
                            pages viewed, time on page, scroll depth and triggered events). The information
                            generated may be transferred to and stored on Google servers, including in the
                            USA. The third-country transfer is safeguarded by the Standard Contractual
                            Clauses and/or the EU-U.S. Data Privacy Framework.
                        </p>

                        <h4>Reddit Pixel</h4>
                        <p>
                            The Website embeds the &bdquo;Reddit Pixel&ldquo; of Reddit, Inc., 1455 Market
                            Street, San Francisco, CA 94103, USA. A script is loaded from
                            <code> www.redditstatic.com</code> that records the page visit and further events
                            (for example interactions). The Reddit Pixel is used to measure and optimise
                            advertising campaigns on Reddit. Data may be processed in the USA.
                        </p>

                        <h3>5. Search function (Algolia)</h3>
                        <p>
                            The documentation search uses Algolia DocSearch by Algolia SAS, 55 Rue
                            d&apos;Amsterdam, 75008 Paris, France. When you use the search, your query is
                            transmitted to Algolia in order to return matching results. The legal basis is
                            Art. 6(1)(f) GDPR (legitimate interest in a working search function).
                        </p>

                        <h3>6. Embedded forms and external services</h3>
                        <p>
                            On some pages (for example the premium and consulting pages) forms of the
                            provider <b>Pipedrive</b> (Pipedrive OÜ, Mustamäe tee 3a, 10615 Tallinn,
                            Estonia) are provided as embedded content (iframe). If you open and fill out such
                            a form, the data you enter is transmitted to Pipedrive and processed there to
                            handle your request. The legal basis is Art. 6(1)(b) GDPR (initiation or
                            performance of a contract) and Art. 6(1)(f) GDPR.
                        </p>
                        <p>
                            Further external services are integrated via links or redirects. Your data is
                            only transmitted to the respective provider once you actively use the link. The
                            privacy policy of the respective provider then applies:
                        </p>
                        <ul style={{ textAlign: 'left' }}>
                            <li>
                                <b>Newsletter (Mailchimp):</b> The newsletter page redirects to a signup
                                form of the Mailchimp service (The Rocket Science Group LLC, USA). Signing up
                                and the associated processing of your email address is based solely on your
                                consent (Art. 6(1)(a) GDPR), which you can revoke at any time.
                            </li>
                            <li>
                                <b>Payments (Stripe):</b> To book consulting services, you are redirected to
                                a Stripe payment link (Stripe, Inc.). Payment is processed directly by
                                Stripe.
                            </li>
                            <li>
                                <b>Discord:</b> The community link redirects to a Discord server (Discord
                                Inc., USA).
                            </li>
                        </ul>

                        <h3>7. Fonts</h3>
                        <p>
                            The fonts used on the Website are served locally from our own server. There is
                            no connection to third-party servers (for example Google Fonts), and no data is
                            transmitted to third parties for this purpose.
                        </p>

                        <h3>8. Your rights as a data subject</h3>
                        <p>
                            Subject to the statutory requirements, you have the following rights:
                        </p>
                        <ul style={{ textAlign: 'left' }}>
                            <li>Right of access (Art. 15 GDPR)</li>
                            <li>Right to rectification (Art. 16 GDPR)</li>
                            <li>Right to erasure (Art. 17 GDPR)</li>
                            <li>Right to restriction of processing (Art. 18 GDPR)</li>
                            <li>Right to data portability (Art. 20 GDPR)</li>
                            <li>Right to withdraw a given consent (Art. 7(3) GDPR)</li>
                        </ul>
                        <p>
                            To exercise your rights, an informal message to the controller named above is
                            sufficient.
                        </p>

                        <h3>9. Right to object</h3>
                        <p>
                            Where your personal data is processed on the basis of legitimate interests under
                            Art. 6(1)(f) GDPR, you have the right to object to this processing at any time on
                            grounds relating to your particular situation (Art. 21 GDPR). Where processing is
                            carried out for direct marketing purposes, you have the right to object at any
                            time without giving reasons.
                        </p>

                        <h3>10. Right to lodge a complaint with a supervisory authority</h3>
                        <p>
                            Without prejudice to any other remedy, you have the right to lodge a complaint
                            with a data protection supervisory authority if you consider that the processing
                            of your personal data infringes the GDPR (Art. 77 GDPR). The competent
                            supervisory authority is the State Commissioner for Data Protection and Freedom
                            of Information of Baden-Württemberg, Lautenschlagerstraße 20, 70173 Stuttgart,
                            Germany.
                        </p>

                        <h3>11. Validity and changes to this privacy policy</h3>
                        <p>
                            This privacy policy may be adapted when the legal situation or the services used
                            on the Website change. The version published on this page applies in each case.
                        </p>
                    </div>
                </main>
            </Layout >
        </>
    );
}
