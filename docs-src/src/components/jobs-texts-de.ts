/**
 * German texts of the jobs page at /jobs/.
 * They live in their own file so that codespell, which only knows English,
 * can skip them while it still checks the English texts in jobs.tsx.
 */
export const JOBS_TEXTS_DE = {
    /**
     * Gets the sitewide ` | RxDB` suffix, so the brand is not repeated
     * here. Only JOBS_TITLE is exempt from the suffix.
     */
    title: 'Jobs & offene Stellen',
    description: 'Offene Werkstudentenstellen bei RxDB in Stuttgart. 17 € pro Stunde.',
    headline: 'Karriere bei',
    switchLanguage: 'Read this page in English',
    intro: 'RxDB ist eine Datenbank, die im Browser und auf dem Handy läuft. Apps, die damit gebaut sind, funktionieren ohne Netz weiter und synchronisieren, sobald wieder eine Verbindung da ist. RxDB ist ein Open-Source-Projekt, das Entwickler auf der ganzen Welt nutzen, und wir suchen Leute, die etwas bauen wollen, statt nur Credit Points zu sammeln. Beide offenen Stellen sind Werkstudentenstellen in Stuttgart 🇩🇪.',
    customersTitle: 'Wer RxDB einsetzt',
    customers: [
        'Venice.ai, eine KI-Plattform mit über 3 Millionen Nutzern, streamt die Antworten ihrer KI direkt in RxDB.',
        'Bei Nutrien melden die Maschinenführer im Bergwerk unter Tage über eine RxDB-App, wie es am Abbaustoß aussieht.',
        'Readwise speichert damit pro Nutzer zehntausende Artikel und Bücher, auf jedem Gerät.',
        'WooCommerce POS baut damit ein Kassensystem, das als Web-, Desktop- und Mobile-App aus einer einzigen Codebasis läuft.',
        'myAgro, das über 250.000 Kleinbauern in Westafrika hilft, Saatgut und Dünger per Handy zu kaufen, verwaltet seine Daten mit RxDB.',
        'MoreApp, SafeEx und WebWare schicken damit Prüfer und Techniker raus, auch dorthin, wo kein Netz ist.',
        'Ein großer australischer Baukonzern prüft damit die Qualität auf seinen Baustellen.',
        'Ein Startup, das Drohnenabwehrsysteme baut, nutzt RxDB.',
        'MongoDB und Supabase sind offizielle Partner.'
    ],
    summary: '17 € pro Stunde, 10 bis 20 Stunden pro Woche, vor Ort in Stuttgart 🇩🇪',
    openAdvert: 'Ganze Stellenanzeige lesen',
    openAdvertAria: 'Stellenanzeige öffnen: ',
    apply: 'Jetzt bewerben',
    sectionTasks: 'Das machst du',
    sectionRequirements: 'Das bringst du mit',
    sectionConditions: 'Das bekommst du',
    conditions: [
        '17 € pro Stunde',
        '10 bis 20 Stunden pro Woche, passend zum Vorlesungsplan',
        'Regelmäßig vor Ort in Stuttgart 🇩🇪, teilweise im Homeoffice',
        'Start nach Absprache, auch mitten im Semester',
        'Alles, was du baust, ist Open Source und wird mit deinem Namen genannt'
    ],
    why: [
        {
            title: 'Deine Arbeit ist öffentlich',
            text: 'Alles, was du baust, ist Open Source. Deine Commits, deine Videos und dein Name sind für jeden künftigen Arbeitgeber sichtbar.'
        },
        {
            title: 'Echte Nutzer ab Tag eins',
            text: 'RxDB läuft in Produktion bei vielen Firmen weltweit. Was du auslieferst, wird benutzt.'
        },
        {
            title: 'Verantwortung statt Kleinkram',
            text: 'Du bekommst ein Thema, das dir gehört, und entscheidest selbst, wie du es löst. Kaffee holen gehört nicht zum Job.'
        }
    ],
    jobs: [
        {
            title: 'Werkstudent (m/w/d) Developer Experience, Frontend',
            teaser: 'Du schreibst Code für den Kern von RxDB. Er landet im nächsten npm-Release und läuft in Apps, die echte Firmen jeden Tag benutzen. Kein internes Tool, keine Foliensammlung, kein Ticket, das niemand liest.',
            tasks: [
                'Herausfinden, wo Entwickler mit RxDB hängen bleiben, und die Ursache direkt im Code beheben',
                'Die öffentliche API so gestalten, dass sie beim ersten Versuch das tut, was man erwartet',
                'Kryptische Fehler in Meldungen verwandeln, die genau sagen, was schiefging und wie man es behebt',
                'Kleine Demo-Apps und Beispiele bauen, die zeigen, was Local-First im Browser kann',
                'Lesen, was die Community jede Woche fragt, und daraus Änderungen an Produkt und Doku machen'
            ],
            requirements: [
                'Du studierst Informatik, Softwaretechnik, Medieninformatik oder etwas Vergleichbares',
                'Du schreibst sicher TypeScript. React, Angular, Vue oder Svelte ist ein Plus.',
                'Du hast Dinge gebaut, die niemand bei dir bestellt hat. Schick uns dein GitHub-Profil statt eines Anschreibens.',
                'Du hast eine Meinung zu Tools, APIs und Developer Experience und kannst sie begründen'
            ]
        },
        {
            title: 'Werkstudent (m/w/d) Developer Experience, Video und Social Media',
            teaser: 'Du verantwortest den Videokanal von RxDB. Idee, Kamera, Schnitt, Upload. Du entscheidest, was funktioniert, du siehst die Zahlen, und du hast die Freiheit, Formate auszuprobieren, die sonst niemand im Datenbank-Bereich macht.',
            tasks: [
                'Videoideen entwickeln, die Entwickler sehen wollen, und sie drehen',
                'Komplett selbst schneiden: Schnitt, Ton, Titel, Thumbnails',
                'Aus jedem Video Shorts und Reels für YouTube, LinkedIn, Instagram und TikTok machen',
                'Den YouTube-Kanal betreuen und in den Kommentaren mit der Community sprechen',
                'Reichweite und Engagement auswerten und entscheiden, was als Nächstes produziert wird'
            ],
            requirements: [
                'Du studierst audiovisuelle Medien, Online-Medien, Werbung und Marktkommunikation, Medieninformatik oder etwas Vergleichbares',
                'Du drehst und schneidest selbstständig. Zeig uns deine besten Arbeitsproben, ein Portfolio, einen Kanal oder ein Reel.',
                'Du interessierst dich für Software. Programmieren gehört nicht zur Stelle, aber du verstehst, was auf dem Bildschirm passiert, und kannst ein kurzes Code-Snippet lesen.',
                'Du hast ein Gespür dafür, was Leute beim Scrollen stoppen lässt'
            ]
        }
    ]
};
