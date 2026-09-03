import { useState } from 'react';
import { DB_VIEWER_COLORS } from '../theme.ts';
import type { DbViewerClient } from '../client.ts';
import type { ViewerStore } from '../store.ts';
import type { DbViewerNavigation } from '../../../src/types/index.d.ts';
import type { DbViewerSnapshot } from '../../../src/plugins/db-viewer/protocol.ts';

type Command = {
    label: string;
    hint: string;
    run: () => void;
};

export function CommandPalette({ store, client, onClose }: {
    store: ViewerStore;
    client: DbViewerClient;
    onClose: () => void;
}) {
    const [filter, setFilter] = useState('');
    const go = (navigation: DbViewerNavigation) => () => {
        store.navigate(navigation);
        onClose();
    };

    const commands: Command[] = [
        ...store.collectionNames.map(name => ({
            label: 'Open collection ' + name,
            hint: 'collection',
            run: go({ kind: 'collection', name })
        })),
        { label: 'Live activity map', hint: 'tool', run: go({ kind: 'tool', tool: 'live' }) },
        { label: 'Schema analysis', hint: 'tool', run: go({ kind: 'tool', tool: 'schema' }) },
        { label: 'Changes feed', hint: 'tool', run: go({ kind: 'tool', tool: 'changes' }) },
        { label: 'Query lab', hint: 'tool', run: go({ kind: 'tool', tool: 'querylab' }) },
        { label: 'Storage', hint: 'tool', run: go({ kind: 'tool', tool: 'storage' }) },
        { label: 'Settings', hint: 'tool', run: go({ kind: 'settings' }) },
        {
            label: 'Close the database viewer',
            hint: 'action',
            run: () => void client.call('close', {})
        }
    ];
    const needle = filter.trim().toLowerCase();
    const shown = needle === ''
        ? commands
        : commands.filter(command => command.label.toLowerCase().includes(needle));

    return (
        <Modal onClose={onClose} width="520px">
            <input
                className="rxdbv-query-input"
                autoFocus
                spellCheck={false}
                placeholder="Type a command…"
                value={filter}
                onChange={event => setFilter(event.target.value)}
                onKeyDown={event => {
                    if (event.key === 'Enter' && shown.length > 0) {
                        shown[0].run();
                    }
                }}
                style={{ width: '100%', padding: '10px 12px', fontSize: '13px' }}
            />
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {shown.length === 0 && (
                    <div className="rxdbv-dim" style={{ padding: '10px 12px' }}>no command matches</div>
                )}
                {shown.map(command => (
                    <div
                        key={command.label}
                        className="rxdbv-rail-item"
                        onClick={command.run}
                    >
                        <span className="rxdbv-rail-label">{command.label}</span>
                        <span className="rxdbv-dim" style={{ fontSize: '10px' }}>{command.hint}</span>
                    </div>
                ))}
            </div>
        </Modal>
    );
}

export function HelpModal({ snapshot, onClose }: { snapshot: DbViewerSnapshot; onClose: () => void; }) {
    return (
        <Modal onClose={onClose} width="460px">
            <div className="rxdbv-modal-title">RxDB database viewer</div>
            <div className="rxdbv-modal-body">
                <p>
                    This UI runs in an iframe that is loaded from rxdb.info and talks to the
                    database in your app over <span className="rxdbv-mono">postMessage</span>.
                    No document ever leaves your browser.
                </p>
                <p>
                    <span className="rxdbv-mono">⌘K</span> opens the command palette.{' '}
                    <span className="rxdbv-mono">Esc</span> closes what is open.
                </p>
                <p className="rxdbv-dim">
                    {'database ' + snapshot.databaseName + ' · storage ' + snapshot.storageName +
                        ' · RxDB v' + snapshot.rxdbVersion +
                        ' · protocol v' + snapshot.protocolVersion}
                </p>
                <p>
                    <a href="https://rxdb.info/db-viewer.html" target="_blank" rel="noreferrer">
                        Read the documentation
                    </a>
                </p>
            </div>
        </Modal>
    );
}

export function Modal({ children, onClose, width = '420px' }: {
    children: React.ReactNode;
    onClose: () => void;
    width?: string;
}) {
    return (
        <div className="rxdbv-overlay" onClick={onClose}>
            <div
                className="rxdbv-modal"
                style={{ width }}
                onClick={event => event.stopPropagation()}
            >{children}</div>
        </div>
    );
}

export function ConfirmDeleteModal({ collectionName, matching, total, onCancel, onConfirm }: {
    collectionName: string;
    matching: number;
    total: number;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const [typed, setTyped] = useState('');
    return (
        <Modal onClose={onCancel} width="460px">
            <div className="rxdbv-modal-title" style={{ color: DB_VIEWER_COLORS.danger }}>
                {'Delete ' + matching + ' of ' + total + ' documents?'}
            </div>
            <div className="rxdbv-modal-body">
                <p>
                    The deletes are written as tombstones and replicate to every connected peer.
                    The tombstones stay in storage until a cleanup runs.
                </p>
                <p>
                    Type <span className="rxdbv-mono" style={{ fontWeight: 700 }}>{collectionName}</span>{' '}
                    to confirm.
                </p>
                <input
                    className="rxdbv-query-input"
                    autoFocus
                    spellCheck={false}
                    value={typed}
                    onChange={event => setTyped(event.target.value)}
                    style={{ width: '100%', padding: '8px 10px' }}
                />
            </div>
            <div className="rxdbv-modal-actions">
                <button className="rxdbv-btn" onClick={onCancel}>Cancel</button>
                <button
                    className="rxdbv-btn rxdbv-btn-danger"
                    disabled={typed !== collectionName}
                    onClick={onConfirm}
                >{'Delete ' + matching + ' documents'}</button>
            </div>
        </Modal>
    );
}
