import { useState } from 'react';
import { formatNumber, parseSelector } from '../format.ts';
import { DB_VIEWER_COLORS } from '../theme.ts';
import type { PanelProps } from '../app.tsx';
import type { DbViewerExplainResult } from '../../../src/plugins/db-viewer/protocol.ts';

/**
 * Runs the current selector and explains what the storage had to do:
 * which index was used, how many documents it examined and what it discarded.
 */
export function QueryLabPanel({ store, client }: PanelProps) {
    const collectionName = store.scopedCollectionName;
    const [result, setResult] = useState<DbViewerExplainResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);

    if (!collectionName) {
        return <div className="rxdbv-main rxdbv-scroll"><div className="rxdbv-center">No collections to query.</div></div>;
    }
    const view = store.getView(collectionName);

    const explain = async () => {
        const parsed = parseSelector(view.queryInput);
        if (!parsed.ok) {
            setError(parsed.error.message);
            setResult(null);
            return;
        }
        setError(null);
        setRunning(true);
        const startedAt = performance.now();
        try {
            const explained = await client.call('explain', {
                collectionName,
                selector: parsed.value,
                sort: view.sort
            });
            setElapsedMs(performance.now() - startedAt);
            setResult(explained);
        } catch (caught) {
            setError((caught as Error).message);
            setResult(null);
        }
        setRunning(false);
    };

    return (
        <div className="rxdbv-main rxdbv-scroll">
            <div className="rxdbv-toolbar">
                <span className="rxdbv-panel-title">Query lab</span>
                <span className="rxdbv-mono rxdbv-muted" style={{ fontSize: '11px' }}>{collectionName}</span>
                <div className="rxdbv-query-input-wrap">
                    <span className="rxdbv-dim">find</span>
                    <input
                        className="rxdbv-query-input"
                        spellCheck={false}
                        defaultValue={view.queryInput}
                        onChange={event => {
                            view.queryInput = event.target.value;
                        }}
                        onKeyDown={event => {
                            if (event.key === 'Enter') {
                                void explain();
                            }
                        }}
                    />
                </div>
                <button
                    className="rxdbv-btn"
                    style={{ borderColor: DB_VIEWER_COLORS.pink, background: 'rgba(237,22,143,0.12)' }}
                    onClick={() => void explain()}
                >Explain</button>
                <button
                    className="rxdbv-btn rxdbv-btn-primary"
                    onClick={() => store.navigate({ kind: 'collection', name: collectionName })}
                >Run</button>
            </div>

            {error && (
                <div className="rxdbv-callout rxdbv-callout-error">
                    <div className="rxdbv-callout-title" style={{ color: DB_VIEWER_COLORS.danger }}>
                        ✕ The query could not run
                    </div>
                    <div className="rxdbv-callout-body">{error}</div>
                </div>
            )}

            {!error && !result && (
                <div className="rxdbv-dim" style={{ padding: '14px 12px' }}>
                    {running ? 'running…' : 'Press Explain to analyse the selector above.'}
                </div>
            )}

            {!error && result && (
                <>
                    <Cards result={result} elapsedMs={elapsedMs} />
                    <Plan result={result} />
                    <Findings result={result} />
                </>
            )}
        </div>
    );
}

function Cards({ result, elapsedMs }: { result: DbViewerExplainResult; elapsedMs: number; }) {
    const card = (label: string, value: string, color?: string) => (
        <div className="rxdbv-card" key={label}>
            <div className="rxdbv-section-label">{label}</div>
            <div className="rxdbv-card-value" style={color ? { color } : undefined}>{value}</div>
        </div>
    );
    return (
        <div className="rxdbv-cards">
            {card('INDEX USED', JSON.stringify(result.index))}
            {card('EXAMINED', formatNumber(result.examined), DB_VIEWER_COLORS.warning)}
            {card('RETURNED', formatNumber(result.returned), DB_VIEWER_COLORS.success)}
            {card('ELAPSED', (Math.round(elapsedMs * 10) / 10) + ' ms')}
        </div>
    );
}

/**
 * The planner fills unbounded index fields with sentinels, which the host
 * already replaced by an empty string, so an all-empty bound reads as a
 * full scan rather than as `-9007199254740991 to "￿"`.
 */
function describeBounds(result: DbViewerExplainResult): string {
    const index = result.index ?? [];
    const described = index.map((field, position) => {
        const start = result.startKeys[position] ?? '';
        const end = result.endKeys[position] ?? '';
        if (start === '' && end === '') {
            return null;
        }
        if (start === end) {
            return field + ' = ' + start;
        }
        return field + ' from ' + (start === '' ? 'start' : start) +
            ' to ' + (end === '' ? 'end' : end);
    }).filter(part => part !== null);
    return described.length === 0 ? 'none, the whole index is scanned' : described.join(', ');
}

function Plan({ result }: { result: DbViewerExplainResult; }) {
    const discarded = Math.max(0, result.examined - result.returned);
    const steps: [string, string, string][] = [
        [
            '1',
            'index scan on ' + JSON.stringify(result.index) + ' — bounds: ' + describeBounds(result),
            formatNumber(result.examined) + ' candidates'
        ],
        result.selectorSatisfiedByIndex
            ? ['2', 'in-memory filter — skipped, the index covers the whole selector', '0 discarded']
            : ['2', 'in-memory filter — the remaining selector fields', formatNumber(discarded) + ' discarded'],
        [
            '3',
            result.sortSatisfiedByIndex ? 'sort — skipped, index order reused' : 'sort — re-sorted in memory',
            result.sortSatisfiedByIndex ? '0 ms' : formatNumber(result.returned) + ' rows'
        ]
    ];
    return (
        <div>
            <div className="rxdbv-section-label" style={{ padding: '0 12px' }}>EXECUTION PLAN</div>
            <div
                className="rxdbv-mono"
                style={{ margin: '6px 12px', border: '1px solid rgba(255,255,255,0.10)', fontSize: '11px' }}
            >
                {steps.map(([number, description, count], index) => (
                    <div
                        key={number}
                        style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '6px 10px',
                            borderBottom: index === steps.length - 1
                                ? undefined
                                : '1px solid rgba(255,255,255,0.06)'
                        }}
                    >
                        <span className="rxdbv-dim" style={{ width: '14px' }}>{number}</span>
                        <span className="rxdbv-grow">{description}</span>
                        <span className="rxdbv-muted">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Findings({ result }: { result: DbViewerExplainResult; }) {
    return (
        <div>
            <div className="rxdbv-section-label" style={{ padding: '12px 12px 0' }}>FINDINGS</div>
            {result.findings.length === 0 ? (
                <div className="rxdbv-dim" style={{ padding: '6px 12px 16px' }}>
                    Nothing to report, the index covers this query.
                </div>
            ) : (
                <>
                    {result.findings.map((finding, index) => (
                        <div key={index} className="rxdbv-callout rxdbv-callout-warning">
                            <div
                                className="rxdbv-callout-title"
                                style={{ color: DB_VIEWER_COLORS.warning }}
                            >{'▲ ' + finding.title}</div>
                            <div className="rxdbv-callout-body">{finding.detail}</div>
                        </div>
                    ))}
                    <div style={{ height: '16px' }} />
                </>
            )}
        </div>
    );
}
