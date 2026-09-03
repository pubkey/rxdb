import { formatNumber } from '../format.ts';
import type { PanelProps } from '../app.tsx';

export function SettingsPanel({ store, snapshot, client, notify }: PanelProps) {

    const exportJson = async () => {
        try {
            const result = await client.call('exportJson', {});
            downloadJson(snapshot.databaseName + '-' + Date.now() + '.json', result.json);
        } catch (error) {
            notify((error as Error).message);
        }
    };

    return (
        <div className="rxdbv-main rxdbv-scroll">
            <div className="rxdbv-toolbar">
                <span className="rxdbv-panel-title">Settings</span>
            </div>

            <Section title="DATABASE">
                <Row label="name" value={snapshot.databaseName} />
                <Row label="storage" value={snapshot.storageName} />
                <Row label="RxDB version" value={snapshot.rxdbVersion} />
                <Row label="collections" value={formatNumber(snapshot.collections.length)} />
                <Row
                    label="documents"
                    value={formatNumber(
                        Object.keys(store.counts).reduce((sum, name) => sum + store.counts[name], 0)
                    )}
                />
                <Row
                    label="leader"
                    value={snapshot.isLeader === null
                        ? 'unknown, the leader-election plugin is not added'
                        : String(snapshot.isLeader)}
                />
            </Section>

            <Section title="VIEWER">
                <Row label="surface" value={snapshot.surface} />
                <Row label="rows per page" value={String(snapshot.pageSize)} />
                <Row label="mode" value={store.readOnly ? 'read-only' : 'read/write'} />
                <Row label="protocol version" value={String(snapshot.protocolVersion)} />
                <Row label="runs in" value={window.location.origin} />
            </Section>

            <Section title="EXPORT">
                <div className="rxdbv-dim" style={{ fontSize: '11px', marginBottom: '8px' }}>
                    Writes a JSON export of every collection. Needs the json-dump plugin.
                </div>
                <button className="rxdbv-btn" onClick={() => void exportJson()}>Export JSON…</button>
            </Section>

            <Section title="PRIVACY">
                <div className="rxdbv-dim" style={{ fontSize: '11px', lineHeight: 1.6 }}>
                    This UI is a page from rxdb.info running in an iframe. It talks to your database
                    over postMessage and makes no network request of its own, so no document ever
                    leaves your browser.
                </div>
            </Section>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode; }) {
    return (
        <div style={{ padding: '14px 12px 4px' }}>
            <div className="rxdbv-section-label">{title}</div>
            <div style={{ marginTop: '8px' }}>{children}</div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string; }) {
    return (
        <div
            className="rxdbv-row"
            style={{
                gap: '10px',
                padding: '4px 0',
                fontSize: '11.5px',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}
        >
            <span className="rxdbv-dim" style={{ width: '140px' }}>{label}</span>
            <span className="rxdbv-mono">{value}</span>
        </div>
    );
}

export function downloadJson(fileName: string, data: any): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
}
