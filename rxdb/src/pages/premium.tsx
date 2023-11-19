import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React from 'react';

export default function Home() {
    const { siteConfig } = useDocusaurusContext();

    return (
        <Layout
            title={`${siteConfig.title}`}
            description="RxDB (short for Reactive Database) is a NoSQL-database for JavaScript Applications like Websites, hybrid Apps, Electron-Apps, Progressive Web Apps and Node.js">
            <main>
                foobar
            </main>
        </Layout >
    );
}
