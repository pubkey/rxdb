import { useEffect, useState } from 'react';
import { formatNumber } from '../format.ts';
import { DB_VIEWER_COLORS } from '../theme.ts';
import { GridHead, GridRow } from './grid.tsx';
import type { PanelProps } from '../app.tsx';
import type { DbViewerSchemaReport } from '../../../src/plugins/db-viewer/protocol.ts';

const SAMPLE_SIZE = 1000;
const COLUMNS = '130px 260px 90px 1fr';

const TYPE_COLORS: { [type: string]: string; } = {
    string: DB_VIEWER_COLORS.info,
    number: DB_VIEWER_COLORS.warning,
    integer: DB_VIEWER_COLORS.warning,
    boolean: DB_VIEWER_COLORS.success,
    array: DB_VIEWER_COLORS.pinkDeep,
    object: DB_VIEWER_COLORS.purple,
    null: DB_VIEWER_COLORS.neutralBar,
    missing: DB_VIEWER_COLORS.neutralBar
};

/**
 * Reports what the documents actually contain, next to what the
 * schema declares, and lists the documents that disagree with it.
 */
export function SchemaPanel({ store, client, notify }: PanelProps) {
    const collectionName = store.scopedCollectionName;
    const [report, setReport] = useState<DbViewerSchemaReport | null>(null);

    useEffect(() => {
        if (!collectionName) {
            return;
        }
        let cancelled = false;
        setReport(null);
        client.call('schemaReport', { collectionName, sampleSize: SAMPLE_SIZE })
            .then(result => {
                if (!cancelled) {
                    setReport(result);
                }
            })
            .catch(error => {
                if (!cancelled) {
                    notify((error as Error).message);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [collectionName]);

    if (!collectionName) {
        return (
            <div className="rxdbv-main rxdbv-scroll">
                <div className="rxdbv-center">No collections to analyse.</div>
            </div>
        );
    }
    const collection = store.getCollection(collectionName);

    return (
        <div className="rxdbv-main rxdbv-scroll">
            <div className="rxdbv-toolbar">
                <span className="rxdbv-panel-title">Schema</span>
                <span className="rxdbv-mono rxdbv-muted" style={{ fontSize: '11px' }}>{collectionName}</span>
                <span className="rxdbv-dim" style={{ fontSize: '10px' }}>
                    {'version ' + (collection ? collection.jsonSchema.version : 0) +
                        ' · primary ' + (collection ? collection.primaryPath : '') +
                        (report ? ' · sampled ' + formatNumber(report.sampledCount) + ' documents' : '')}
                </span>
            </div>

            <GridHead columns={COLUMNS} cells={['field', 'types', 'presence', 'flags']} />
            {report === null && (
                <div className="rxdbv-dim" style={{ padding: '8px 12px' }}>sampling documents…</div>
            )}
            {report && report.fields.map(field => {
                const share = report.sampledCount === 0
                    ? 0
                    : Math.round((field.presentCount / report.sampledCount) * 100);
                return (
                    <GridRow
                        key={field.path}
                        className="rxdbv-tr rxdbv-static"
                        columns={COLUMNS}
                        cells={[
                        <span className="rxdbv-mono">{field.path}</span>,
                        <span className="rxdbv-row" style={{ gap: '6px', flexWrap: 'wrap' }}>
                            {field.seenTypes.length === 0 && <span className="rxdbv-dim">no data</span>}
                            {field.seenTypes.map(type => (
                                <span
                                    key={type}
                                    className="rxdbv-mono"
                                    style={{
                                        color: TYPE_COLORS[type] ?? DB_VIEWER_COLORS.fgMuted,
                                        fontSize: '10.5px'
                                    }}
                                >{type}</span>
                            ))}
                            {field.declaredType !== 'undeclared' &&
                                !field.seenTypes.includes(field.declaredType) &&
                                field.seenTypes.length > 0 && (
                                    <span
                                        className="rxdbv-dim"
                                        style={{ fontSize: '10px' }}
                                    >{'declared ' + field.declaredType}</span>
                                )}
                        </span>,
                        <span className="rxdbv-mono rxdbv-muted">{share + '%'}</span>,
                        <span className="rxdbv-dim" style={{ fontSize: '10.5px' }}>
                            {[
                                field.required ? 'required' : null,
                                field.indexed ? 'indexed' : null,
                                field.declaredType === 'undeclared' ? 'not in the schema' : null
                            ].filter(Boolean).join(' · ') || '—'}
                        </span>
                        ]}
                    />
                );
            })}

            {report && (
                <div style={{ padding: '16px 12px 20px' }}>
                    <div className="rxdbv-row" style={{ gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '12px' }}>Schema violations</span>
                        <span
                            className="rxdbv-mono"
                            style={{
                                color: report.violations.length > 0
                                    ? DB_VIEWER_COLORS.danger
                                    : DB_VIEWER_COLORS.success
                            }}
                        >
                            {report.violations.length === 0
                                ? 'none'
                                : formatNumber(report.violations.length) + ' documents'}
                        </span>
                    </div>
                    {report.violations.map((violation, index) => (
                        <div
                            key={index}
                            className="rxdbv-row"
                            style={{
                                gap: '10px',
                                padding: '4px 0',
                                fontSize: '11px',
                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                            }}
                        >
                            <span className="rxdbv-mono rxdbv-muted" style={{ width: '70px' }}>
                                {violation.documentId}
                            </span>
                            <span className="rxdbv-mono rxdbv-grow">
                                {violation.path + ': ' + violation.detail}
                            </span>
                            <a
                                style={{ fontSize: '10px' }}
                                onClick={() => {
                                    store.getView(collectionName).openDocumentId = violation.documentId;
                                    store.navigate({ kind: 'collection', name: collectionName });
                                }}
                            >open</a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
