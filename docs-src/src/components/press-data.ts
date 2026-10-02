export type CitationType = 'paper' | 'thesis' | 'book' | 'news' | 'article' | 'talk' | 'video' | 'podcast' | 'report';

export const CITATION_TYPE_LABELS: Record<CitationType, string> = {
    paper: 'Research Paper',
    thesis: 'Thesis',
    book: 'Book',
    news: 'News',
    article: 'Article',
    talk: 'Talk',
    video: 'Video',
    podcast: 'Podcast',
    report: 'Report',
};

export type Citation = {
    title: string;
    /**
     * Author, publisher, journal or conference.
     */
    source: string;
    type: CitationType;
    /**
     * As precise as known: YYYY, YYYY-MM or YYYY-MM-DD.
     */
    date: string;
    url: string;
    /**
     * One sentence about how the publication covers or uses RxDB.
     */
    summary: string;
};

/**
 * Third-party publications that cite or mention RxDB, newest first.
 * Rendered on the "RxDB in the Press" page at /press/. New entries come in via the form on that page,
 * which opens a GitHub issue with the "[Press]" title prefix.
 */
export const CITATIONS: Citation[] = [
    {
        'title': 'Offline-First Mobile Apps: Designing for Unreliable Connectivity',
        'source': 'Mehran Khan, Cubix',
        'type': 'article',
        'date': '2026-09-24',
        'url': 'https://www.cubix.co/blog/offline-first-mobile-apps-connectivity/',
        'summary': 'Lists RxDB with Redux Offline and PouchDB as libraries that handle queuing, caching, and sync for offline-first mobile apps.'
    },
    {
        'title': 'Why Fetch When You Can Sync? Building Local-First Apps on a Sync Engine Architecture',
        'source': 'James Arthur, QCon San Francisco 2025 (InfoQ)',
        'type': 'talk',
        'date': '2026-08-20',
        'url': 'https://www.infoq.com/presentations/local-first-sync-engine/',
        'summary': 'Conference talk that names RxDB among local-first sync engines and among third-party collection implementations for TanStack DB.'
    },
    {
        'title': 'Web Development Tools - 8 innovative Optionen',
        'source': 'Matthew Tyson, Computerwoche',
        'type': 'news',
        'date': '2026-06-16',
        'url': 'https://www.computerwoche.de/article/4183646/web-development-tools-8-innovative-optionen.html',
        'summary': 'German edition of the InfoWorld article, describing RxDB as a NoSQL, offline-first, reactive local-first datastore.'
    },
    {
        'title': '8 web development tools reimagining web development',
        'source': 'Matthew Tyson, InfoWorld',
        'type': 'news',
        'date': '2026-06-09',
        'url': 'https://www.infoworld.com/article/4181872/8-web-development-tools-reimagining-web-development.html',
        'summary': 'Mentions RxDB next to PowerSync as a NoSQL, offline-first, reactive database that exposes queries as observable streams.'
    },
    {
        'title': 'Local-First Software for SaaS Builders: Honest Guide 2026',
        'source': 'BuildMVP Fast',
        'type': 'article',
        'date': '2026-05',
        'url': 'https://www.buildmvpfast.com/blog/local-first-software-saas-rxdb-pouchdb-sync-2026',
        'summary': 'Compares RxDB with PouchDB, Zero, PowerSync, and ElectricSQL for building local-first SaaS products.'
    },
    {
        'title': 'RxDB 17: Sync without server, access for AI agents',
        'source': 'Moritz Förster, heise online (iX)',
        'type': 'news',
        'date': '2026-04-01',
        'url': 'https://www.heise.de/en/news/RxDB-17-Sync-without-server-access-for-AI-agents-11242448.html',
        'summary': 'News article on the RxDB 17 release, covering serverless cloud sync, AI agent access, and the limits of cloud storage sync.'
    },
    {
        'title': 'Why local-first matters for JavaScript',
        'source': 'Matthew Tyson, InfoWorld',
        'type': 'news',
        'date': '2026-03-06',
        'url': 'https://www.infoworld.com/article/4140812/why-local-first-matters-for-javascript.html',
        'summary': 'Names RxDB and PGlite as local databases developers use to build data storage directly in the browser.'
    },
    {
        'title': 'The browser is your database: Local-first comes of age',
        'source': 'Matthew Tyson, InfoWorld',
        'type': 'news',
        'date': '2026-02-26',
        'url': 'https://www.infoworld.com/article/4133648/the-browser-is-your-database-local-first-comes-of-age.html',
        'summary': 'Feature with a dedicated section on RxDB as the NoSQL counterpart to PGlite, including a reactive query code sample.'
    },
    {
        'title': 'RxDB: Reactive NoSQL Database for Local-First Applications',
        'source': 'DevRadar Open Research',
        'type': 'article',
        'date': '2026-01',
        'url': 'https://devradar-dev.github.io/open-research/databases/rxdb/',
        'summary': 'Profile page describing RxDB as a reactive NoSQL database for local-first applications.'
    },
    {
        'title': 'The Limits of Generalized Sync: A Taxonomy of Architectures, Trade-offs, and Decision Factors',
        'source': 'Mikael Siidorow, Aalto University (Master\'s thesis)',
        'type': 'thesis',
        'date': '2026',
        'url': 'https://aaltodoc.aalto.fi/server/api/core/bitstreams/d485ca46-ef01-41bc-ae4c-d468afb209a8/content',
        'summary': 'Classifies RxDB as a toolkit architecture with configurable sync and full offline support in a taxonomy of about a dozen sync systems.'
    },
    {
        'title': 'Offline-first-synkronointikirjaston kehittäminen ja soveltaminen mobiilisovelluksessa',
        'source': 'Jaakko Mattila, Juho Kultala, Taneli Lesell, Oulu University of Applied Sciences (Bachelor\'s thesis)',
        'type': 'thesis',
        'date': '2026',
        'url': 'https://www.theseus.fi/bitstream/handle/10024/923251/kultala_lesell_mattila.pdf?sequence=2',
        'summary': 'Finnish thesis that compares RxDB with WatermelonDB, Redux-offline, and react-native-offline for offline-first mobile apps.'
    },
    {
        'title': 'How to Build a CRUD App with TanStack Start and TanStackDB (with RxDB Integration)',
        'source': 'Andrew Baisden, freeCodeCamp News',
        'type': 'article',
        'date': '2025-10-27',
        'url': 'https://www.freecodecamp.org/news/how-to-build-a-crud-app-with-tanstack-start-and-tanstackdb-with-rxdb-integration/',
        'summary': 'Tutorial that uses RxDB as the local persistence layer for a TanStack Start and TanStack DB CRUD app.'
    },
    {
        'title': 'How I Built Local-First Apps with React Native + RxDB (and Why Your App Probably Needs This Too)',
        'source': 'Dmitriy Kasperovich, HackerNoon',
        'type': 'article',
        'date': '2025-08-11',
        'url': 'https://hackernoon.com/how-i-built-local-first-apps-with-react-native-rxdb-and-why-your-app-probably-needs-this-too',
        'summary': 'Hands-on tutorial on building React Native apps with RxDB replication, conflict handlers, SQLite storage, and encryption.'
    },
    {
        'title': 'Crust: A Modular Framework for Conflict-Free Replicated Data Types (CRDTs) Development, Validation, and Benchmarking',
        'source': 'Yunrui Zhu, Jing Ma, IEEE Access, vol. 13',
        'type': 'paper',
        'date': '2025-05-12',
        'url': 'https://ieeexplore.ieee.org/abstract/document/11000289/',
        'summary': 'Cites RxDB as an example of a database-focused CRDT implementation in a survey of CRDT repositories on GitHub.'
    },
    {
        'title': 'RxJS Cookbook for Reactive Programming',
        'source': 'Nikola Mitrović, Packt Publishing',
        'type': 'book',
        'date': '2025-03',
        'url': 'https://www.packtpub.com/en-us/product/rxjs-cookbook-for-reactive-programming-9781788624053',
        'summary': 'Contains a seven-page recipe, "Building offline-ready applications seamlessly with RxDB", on schemas, change events, queries, and replication.'
    },
    {
        'title': 'CRDV: Conflict-free Replicated Data Views',
        'source': 'Nuno Faria, José Pereira, Proceedings of the ACM on Management of Data',
        'type': 'paper',
        'date': '2025',
        'url': 'https://dl.acm.org/doi/10.1145/3709675',
        'summary': 'Discusses the RxDB CRDT plugin in its related work and includes RxDB in a comparison table of CRDT systems.'
    },
    {
        'title': 'Unlocking the Power of Real-Time Data Management with RxDB',
        'source': 'alex7842, DEV Community',
        'type': 'article',
        'date': '2024-10-10',
        'url': 'https://dev.to/alex7842/unlocking-the-power-of-real-time-data-management-with-rxdb-npm',
        'summary': 'Blog post introducing RxDB and its reactive approach to data changes.'
    },
    {
        'title': 'Exploring RxDB: The Concepts It Holds',
        'source': 'smrifat1411, DEV Community',
        'type': 'article',
        'date': '2023-08-20',
        'url': 'https://dev.to/smrifat1411/exploring-rxdb-friend-of-a-js-developer-2oh0',
        'summary': 'Blog post introducing the core concepts of RxDB for JavaScript developers.'
    },
    {
        'title': 'Internal of RXDB: Plugins, Storages Adapters',
        'source': 'Dharan Ganesan, DEV Community',
        'type': 'article',
        'date': '2023-03-24',
        'url': 'https://dev.to/dhrn/internal-of-rxdb-plugins-storages-adapters-3bi3',
        'summary': 'Blog post explaining the RxDB plugin system and storage adapters.'
    },
    {
        'title': 'Collaborative web application for real-time monitoring of sport events',
        'source': 'João Diogo Martins Romão, University of Porto (Master\'s dissertation)',
        'type': 'thesis',
        'date': '2023',
        'url': 'https://repositorio-aberto.up.pt/bitstream/10216/154685/2/648734.pdf',
        'summary': 'Describes RxDB in its survey of client-side storage options as a reactive database with data synchronization between devices.'
    },
    {
        'title': 'Release Radar · September 2022 Edition',
        'source': 'Michelle Duke, The GitHub Blog',
        'type': 'article',
        'date': '2022-10-28',
        'url': 'https://github.blog/2022-10-28-release-radar-sept-2022/',
        'summary': 'Features the RxDB 13 release in GitHub\'s monthly showcase of project releases.'
    },
    {
        'title': 'Release Radar · January 2022 Edition',
        'source': 'Michelle Duke, The GitHub Blog',
        'type': 'article',
        'date': '2022-02-04',
        'url': 'https://github.blog/2022-02-04-release-radar-jan-2022/',
        'summary': 'Features the RxDB 11 release in GitHub\'s monthly showcase of project releases.'
    },
    {
        'title': 'Offline Mode Support in Mobile Applications',
        'source': 'Marek Musil, Brno University of Technology (Bachelor\'s thesis)',
        'type': 'thesis',
        'date': '2021',
        'url': 'https://theses.cz/id/ijt1ib/23907_Archive.pdf',
        'summary': 'Compares RxDB with urql, PouchDB, Offix, and AWS DataStore as offline sync libraries, including a feature table.'
    },
    {
        'title': 'Perancangan Aplikasi yang Handal Bencana dengan Progressive Web App menggunakan React JS dan CouchDB',
        'source': 'Charina, Universitas Hasanuddin (Undergraduate thesis)',
        'type': 'thesis',
        'date': '2021',
        'url': 'https://repository.unhas.ac.id/id/eprint/19708/',
        'summary': 'Indonesian thesis with a subsection describing RxDB as a NoSQL database for JavaScript applications.'
    },
    {
        'title': '#OpenSourceDiscovery 32: RxDB',
        'source': 'Pradeep Sharma, OpenSourceDiscovery',
        'type': 'article',
        'date': '2020-05-10',
        'url': 'https://opensourcedisc.substack.com/p/opensourcediscovery-32-rxdb',
        'summary': 'Newsletter issue that reviews RxDB as a reactive NoSQL database with offline-first and encryption features.'
    },
    {
        'title': 'A Reliable Offline Web System for Small and Medium Industries',
        'source': 'Zulkifli Tahir, Al-Riefqy Dasmito, Adnan, Muhammad Niswar, Wardi, MATEC Web of Conferences, vol. 331',
        'type': 'paper',
        'date': '2020',
        'url': 'https://doi.org/10.1051/matecconf/202033106007',
        'summary': 'Presents an offline web system built with React that uses RxDB to store data locally and sync it with a server.'
    },
    {
        'title': 'Real-Time & Stream Data Management: Push-Based Data in Research & Practice',
        'source': 'Wolfram Wingerath, Norbert Ritter, Felix Gessert, Springer (SpringerBriefs in Computer Science)',
        'type': 'book',
        'date': '2019',
        'url': 'https://link.springer.com/chapter/10.1007/978-3-030-10555-6_3',
        'summary': 'The Real-Time Databases chapter describes RxDB as an embedded JavaScript database with real-time queries through local change detection.'
    },
    {
        'title': 'Scalable Push-Based Real-Time Queries on Top of Pull-Based Databases',
        'source': 'Wolfram Wingerath, University of Hamburg (PhD thesis)',
        'type': 'thesis',
        'date': '2019',
        'url': 'https://vsis-www.informatik.uni-hamburg.de/getDoc.php/thesis/1023/wingerath_dissertation_published.pdf',
        'summary': 'Describes RxDB in its survey of real-time databases as an embedded database with local change detection and pluggable storage.'
    }
];
