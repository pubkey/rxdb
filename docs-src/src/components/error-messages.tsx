import React from 'react';
import { ucfirst } from '../../../src/plugins/utils/utils-string';
import { ERROR_MESSAGES } from '../../../src/plugins/dev-mode/error-messages';
import { useLocation } from '@docusaurus/router';

const PREFIX_MAPPING: Record<string, string> = {
    UT: 'util.js / config',
    PL: 'plugins',
    P: 'pouch-db.js',
    QU: 'rx-query',
    MQ: 'mquery.js',
    DB: 'rx-database',
    COL: 'rx-collection',
    WMCP: 'plugins/webmcp',
    CONFLICT: 'rx-collection',
    DOC: 'rx-document.js',
    DM: 'data-migrator.js',
    AT: 'plugins/attachments',
    EN: 'plugins/encryption-crypto-js',
    JD: 'plugins/json-dump',
    LD: 'plugins/local-documents',
    RC: 'plugins/replication',
    SC: 'plugins/dev-mode/check-schema',
    DVM: 'plugins/dev-mode',
    VD: 'plugins/validate',
    S: 'plugins/server',
    GQL: 'plugins/replication-graphql',
    CRDT: 'plugins/crdt',
    DXE: 'plugins/storage-dexie',
    SQL: 'plugins/storage-sqlite-trial',
    RM: 'plugins/storage-remote',
    MG: 'plugins/replication-mongodb',
    R: 'plugins/react',
    GDR: 'plugins/replication-google-drive',
    ODR: 'plugins/replication-microsoft-onedrive',
    FETCH: 'fetch',
    SNH: 'other'
};

function getGroup(errorCode: string) {
    if (errorCode === 'CONFLICT') return 'rx-collection';
    if (errorCode === 'FETCH') return 'fetch';
    if (errorCode === 'SNH') return 'other';
    const match = errorCode.match(/^[A-Za-z_]+/);
    const prefix = match ? match[0] : '';
    if (prefix.startsWith('RC_')) return 'plugins/replication';
    return PREFIX_MAPPING[prefix] || 'Other';
}

const errorEntries = Object.entries(ERROR_MESSAGES);
const groupedErrors = errorEntries.reduce((acc, [errorCode, errorMessage]) => {
    const group = getGroup(errorCode);
    if (!acc[group]) acc[group] = [];
    acc[group].push([errorCode, errorMessage]);
    return acc;
}, {} as Record<string, any[]>);

function ErrorItem({ errorCode, errorMessage, isTarget, styles }: { errorCode: string; errorMessage: any; isTarget: boolean; styles: any; }) {
    return (
        <li
            id={errorCode}
            style={isTarget ? { ...styles.li, ...styles.liHighlight } : styles.li}
        >
            <div style={{ marginBottom: '12px', overflowWrap: 'anywhere' }}>
                <h4 style={{ margin: 0, display: 'inline-block', marginRight: '10px' }}>
                    <a href={'#' + errorCode} style={{ textDecoration: 'none', color: 'inherit' }}>
                        #{errorCode}
                    </a>
                </h4>
                <span style={styles.summaryMessage}>
                    {ucfirst(errorMessage.message)}
                </span>
            </div>

            <div style={styles.detailsContent}>
                {
                    errorMessage.cause &&
                    <div style={{ marginBottom: 18 }}>
                        <b>Cause:</b><br />
                        {errorMessage.cause}
                    </div>
                }
                {
                    errorMessage.fix &&
                    <div style={{ marginBottom: 18 }}>
                        <b>Fix:</b><br />
                        {errorMessage.fix}
                    </div>
                }
                {
                    errorMessage.docs &&
                    <div style={{ marginBottom: 18 }}>
                        <b>Docs:</b><br />
                        <a href={errorMessage.docs} target="_blank">{errorMessage.docs}</a>
                    </div>
                }
                <div style={{ marginBottom: 18 }}>
                    <ul style={{ paddingLeft: 20 }}>
                        <li>
                            <a href={'https://github.com/pubkey/rxdb/search?q=' + errorCode + '&type=code'} target="_blank">Search In Code</a>
                        </li>
                        <li>
                            <a href={'https://github.com/pubkey/rxdb/search?q=' + errorCode + '&type=issues'} target="_blank">Search In Issues</a>
                        </li>
                    </ul>
                </div>
            </div>
        </li>
    );
}

export function ErrorMessages() {
    const location = useLocation();
    const styles = {
        '': { 'boxSizing': 'border-box' },
        ul: {
            listStyleType: 'none',
            padding: 0,
            margin: 0,
        },
        'li': {
            borderStyle: 'solid',
            borderWidth: 1,
            height: 'auto',
            borderColor: 'var(--color-top)',
            padding: '24px 32px',
            borderRadius: 14,
            backgroundColor: 'var(--bg-color-dark)',
            margin: '10px 0',
            marginBottom: '20px',
        },
        liHighlight: {
            boxShadow: '2px 2px 13px var(--color-top), -2px -1px 14px var(--color-top)'
        },
        errorCode: {
            fontSize: '1em',
            margin: '0',
            display: 'inline-block',
            marginRight: '12px',
        },
        summaryMessage: {
            fontSize: '1.05em',
            fontWeight: 'normal',
        },
        detailsContent: {
            marginTop: '20px',
            borderTop: '1px solid var(--color-top)',
            paddingTop: '20px',
        }
    } as any;

    return <div>
        {Object.entries(groupedErrors).map(([group, errors]) => (
            <div key={group} style={{ marginBottom: '40px' }}>
                <h3 style={{ textTransform: 'capitalize', paddingLeft: '10px' }}>{group}</h3>
                <ul style={styles.ul}>
                    {
                        errors.map(([errorCode, errorMessage]) => {
                            const isTarget = location.hash === '#' + errorCode;
                            return <ErrorItem
                                key={errorCode}
                                errorCode={errorCode}
                                errorMessage={errorMessage}
                                isTarget={isTarget}
                                styles={styles}
                            />;
                        })
                    }
                </ul>
            </div>
        ))}
    </div>;
}
