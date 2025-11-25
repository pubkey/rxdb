import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Head from '@docusaurus/Head';
import Layout from '@theme/Layout';
import React from 'react';

export default function LegalNotice() {
    const { siteConfig } = useDocusaurusContext();
    return (
        <>
            <Head>
                <meta name="robots" content="noindex"></meta>
            </Head>
            <Layout
                title={`Legal Notice - ${siteConfig.title}`}
                description="RxDB Legal Notice"
            >
                <main>
                    <div className='redirectBox' style={{ textAlign: 'center' }}>
                        <a href="/">
                            <div className="logo">
                                <img src="/files/logo/logo_text.svg" alt="RxDB" width={160} />
                            </div>
                        </a>
                        <h1><a href="https://rxdb.info/">RxDB</a> Legal Notice</h1>
                        <p>
                            Daniel Meyer - RxDB<br />
                            Friedrichstraße 13<br />
                            70174 Stuttgart<br />
                            Email: <br />
                            <img src="/files/imprint-email.png" alt="RxDB Email" />
                        </p>
                    </div>

                    <div className='redirectBox' style={{padding: '10%'}}>
                        <h3>German Legal Notice</h3>

                        <h6>Umsatzsteuer-ID nach §27a Umsatzsteuergesetz</h6>
                        DE357840955

                        <h6>Verantwortlich für den Inhalt (gem. § 55 Abs. 2 RStV)</h6>
                        Der oben genannte Eigentümer.


                        <h6>Hinweis gemäß Online-Streitbeilegungs-Verordnung</h6>
                        <p>Nach geltendem Recht sind wir verpflichtet, Verbraucher auf die Existenz der Europäischen Online-Streitbeilegungs-Plattform hinzuweisen, welche für die Beilegung von Streitigkeiten genutzt werden kann, ohne dass ein Gericht eingeschaltet werden muss.
                            Für die Einrichtung der Plattform ist die Europäische Kommission zuständig. Die Europäische Online-Streitbeilegungs-Plattform ist hier zu finden: http://ec.europa.eu/odr.
                            Wir weisen ausdrücklich darauf hin, dass wir nicht bereit sind, uns am Streitbeilegungsverfahren im Rahmen der Europäischen Online-Streitbeilegungs-Plattform zu beteiligen.
                        </p>
                        <h6>§ 1 Warnhinweis zu Inhalten</h6>
                        <p>Alle Inhalte dieser Webseite wurden nach Treu und Glauben mit größtmöglicher Sorgfalt erstellt. Wir übernehmen keine Gewähr für die Richtigkeit und Aktualität der bereitgestellten Inhalte und garantieren nicht, dass diese Daten jederzeit auf dem aktuellen Stand sind. Diese Webseite kann technische Ungenauigkeiten oder typographische Fehler enthalten. Wir behalten uns vor, die Informationen dieser Webseite jederzeit und ohne vorherige Ankündigung zu ändern, zu aktualisieren oder zu löschen. In keinem Fall haften wir Ihnen oder Dritten gegenüber für irgendwelche direkten, indirekten, speziellen oder sonstigen Schäden jeglicher Art. </p>
                        <h6>§ 2 Externe Links / Externe Verknüpfungen</h6>
                        <p>Diese Webseite enthält Verknüpfungen zu Webseiten Dritter, zum Beispiel eingebunden durch Links oder Buttons. Diese Webseiten unterliegen der Haftung der jeweiligen Betreiber. Bei der erstmaligen Verknüpfung jeglicher Webseiten Dritter haben wir die fremden Inhalte auf das Bestehen etwaiger Rechtsverstöße überprüft. Zum Zeitpunkt der Überprüfung waren keine Rechtsverstöße ersichtlich. Wir haben keinerlei Einfluss auf die aktuelle und zukünftige Gestaltung und auf die Inhalte der verknüpften Seiten. Das Setzen von externen Verknüpfungen bedeutet nicht, dass wir uns die hinter der Verknüpfung liegenden Inhalte zu eigen machen. Eine ständige Kontrolle der Inhalte sämtlicher externen Verknüpfungen ist ohne konkrete Hinweise auf Rechtsverstöße nicht zumutbar. Bei Kenntnisnahme von Rechtsverstößen werden betroffene Inhalte oder Verknüpfungen unverzüglich gelöscht.</p>
                        <h6>§ 3 Urheber- und Leistungsschutzrechte</h6>
                        <p>Die auf dieser Webseite veröffentlichten Inhalte unterliegen dem deutschen Urheber- und Leistungsschutzrecht. Jede vom deutschen Urheber- und Leistungsschutzrecht nicht zugelassene Verwertung bedarf der vorherigen schriftlichen Zustimmung unsererseits oder des jeweiligen Rechteinhabers. Dies gilt insbesondere für jede Art oder Abwandlung der Vervielfältigung, Bearbeitung, Verarbeitung, Übersetzung, Einspeicherung und Wiedergabe von Inhalten in jeglicher Form. Die unerlaubte Vervielfältigung oder Weitergabe einzelner Inhalte oder kompletter Seiten ist nicht gestattet und strafbar. Die Darstellung dieser Webseite in fremden Frames ist nur mit schriftlicher Erlaubnis unsererseits zulässig.</p>
                        <h6>§ 4 Besondere Nutzungsbedingungen</h6>
                        <p>Soweit besondere Bedingungen für einzelne Nutzungen dieser Webseite von den vorgenannten Paragraphen abweichen, wird an entsprechender Stelle ausdrücklich darauf hingewiesen. In diesem Falle gelten im jeweiligen Einzelfall die besonderen Nutzungsbedingungen. </p>

                        <h6>§ 5 Rechtswirksamkeit dieses Haftungsausschlusses</h6>
                        <p>Dieser Haftungsausschluss ist als Teil des Internetangebotes zu betrachten, von welchem aus auf diese Seite verwiesen wurde. Sofern Teile oder einzelne Formulierungen dieses Textes der geltenden Rechtslage nicht, nicht mehr oder nicht vollständig entsprechen sollten, bleiben die übrigen Teile des Dokumentes in ihrem Inhalt und ihrer Gültigkeit davon unberührt.
                        </p>








                    </div>
                </main>
            </Layout >
        </>
    );
}
