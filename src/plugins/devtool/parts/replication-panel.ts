import { button, clear, el, gridHead, gridRow, spacer } from '../dom.ts';
import { formatBytes, formatClock, shortRevision } from '../format.ts';
import { DEVTOOL_COLORS } from '../theme.ts';
import type { PanelContext } from './context.ts';
import type { RxReplicationState } from '../../replication/index.ts';

const TABLE_COLUMNS = '110px 110px 110px 1fr 1fr';

type DirectionState = {
    label: string;
    color: string;
};

/**
 * One row per replicating collection plus the feed of documents
 * that actually crossed the wire. Pending counts are deliberately absent.
 */
export class ReplicationPanel {
    public readonly element: HTMLElement = el('div', { class: 'rxdt-main rxdt-scroll' });

    constructor(private readonly context: PanelContext) { }

    public destroy(): void { }

    public render(): HTMLElement {
        clear(this.element);
        const store = this.context.store;
        const replicated = store.collectionNames
            .filter(name => store.getReplicationStates(name).length > 0);

        this.element.appendChild(el('div', { class: 'rxdt-toolbar' }, [
            el('span', { class: 'rxdt-panel-title', text: 'Replication' }),
            el('span', {
                class: 'rxdt-muted',
                style: { fontSize: '11px' },
                text: replicated.length + ' collection' + (replicated.length === 1 ? '' : 's') + ' replicating'
            })
        ]));

        if (replicated.length === 0) {
            this.element.appendChild(el('div', { class: 'rxdt-center' }, [
                el('div', { class: 'rxdt-center-inner' }, [
                    el('div', { class: 'rxdt-center-title', text: 'No replication is running' }),
                    el('div', {
                        class: 'rxdt-center-body',
                        text: 'Start one with a replication plugin and it shows up here with its state, checkpoint and live feed.'
                    })
                ])
            ]));
            return this.element;
        }

        this.element.appendChild(gridHead(TABLE_COLUMNS, [
            'collection', 'pull', 'push', 'checkpoint', 'last error'
        ]));
        replicated.forEach(collectionName => {
            store.getReplicationStates(collectionName).forEach(replicationState => {
                this.element.appendChild(this.renderStateRow(collectionName, replicationState));
            });
        });
        this.element.appendChild(this.renderFeed());
        return this.element;
    }

    private renderStateRow(collectionName: string, replicationState: RxReplicationState<any, any>): HTMLElement {
        const store = this.context.store;
        const error = store.replicationErrors.get(collectionName);
        const canceled = replicationState.subjects.canceled.getValue();
        const active = replicationState.subjects.active.getValue();

        const direction = (configured: boolean): DirectionState => {
            if (!configured) {
                return { label: '– none', color: DEVTOOL_COLORS.fgDim };
            }
            if (error) {
                return { label: '▲ error', color: DEVTOOL_COLORS.danger };
            }
            if (canceled) {
                return { label: '■ stopped', color: DEVTOOL_COLORS.fgMuted };
            }
            if (active) {
                return { label: '● streaming', color: DEVTOOL_COLORS.success };
            }
            return { label: '○ idle', color: DEVTOOL_COLORS.fgDim };
        };
        const pull = direction(Boolean(replicationState.pull));
        const push = direction(Boolean(replicationState.push));

        return gridRow(TABLE_COLUMNS, [
            el('span', { class: 'rxdt-mono', text: collectionName }),
            el('span', { style: { color: pull.color }, text: pull.label }),
            el('span', { style: { color: push.color }, text: push.label }),
            el('span', {
                class: 'rxdt-mono rxdt-muted',
                style: { fontSize: '10.5px' },
                title: describeCheckpoint(replicationState),
                text: describeCheckpoint(replicationState)
            }),
            el('span', {
                class: 'rxdt-mono',
                style: { fontSize: '10.5px', color: error ? DEVTOOL_COLORS.danger : DEVTOOL_COLORS.fgDim },
                title: error ? error.message : '',
                text: error
                    ? '✕ ' + error.message + ' · ' + formatClock(error.time) + ' · ' + error.attempts + ' attempts'
                    : 'none'
            })
        ], { class: 'rxdt-tr rxdt-static' });
    }

    private renderFeed(): HTMLElement {
        const store = this.context.store;
        const container = el('div');
        const disabled = Boolean(store.dump);
        container.appendChild(el('div', {
            style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 12px 4px' }
        }, [
            el('span', { class: 'rxdt-section-label', text: 'LIVE FEED' }),
            el('span', {
                class: 'rxdt-dot',
                style: { background: store.replicationFeedPaused ? DEVTOOL_COLORS.fgDim : DEVTOOL_COLORS.success }
            }),
            el('span', {
                class: 'rxdt-dim',
                style: { fontSize: '10px' },
                text: disabled
                    ? 'not available on a dump'
                    : 'documents received and sent, newest first'
            }),
            spacer(),
            button(store.replicationFeedPaused ? 'Resume' : 'Pause', () => {
                store.replicationFeedPaused = !store.replicationFeedPaused;
                this.context.render();
            }, { small: true, disabled })
        ]));

        if (store.replicationFeed.length === 0) {
            container.appendChild(el('div', {
                class: 'rxdt-dim',
                style: { padding: '6px 12px', fontSize: '11px' },
                text: 'Nothing has crossed the wire since the devtool opened.'
            }));
            return container;
        }

        store.replicationFeed.slice(0, store.pageSize).forEach(record => {
            container.appendChild(el('div', {
                class: 'rxdt-mono',
                style: {
                    display: 'flex',
                    gap: '12px',
                    margin: '0 12px',
                    padding: '4px 10px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '11px',
                    alignItems: 'center'
                }
            }, [
                el('span', {
                    style: {
                        width: '12px',
                        fontWeight: '700',
                        color: record.direction === 'pull' ? DEVTOOL_COLORS.info : DEVTOOL_COLORS.pink
                    },
                    text: record.direction === 'pull' ? '↓' : '↑'
                }),
                el('span', { class: 'rxdt-dim', style: { width: '90px' }, text: formatClock(record.time) }),
                el('span', { style: { width: '70px' }, text: record.collectionName }),
                el('span', { class: 'rxdt-muted', style: { width: '70px' }, text: record.documentId }),
                el('span', {
                    class: 'rxdt-dim rxdt-grow',
                    text: shortRevision(record.revision) + ' · ' + formatBytes(record.bytes)
                })
            ]));
        });
        return container;
    }
}

function describeCheckpoint(replicationState: RxReplicationState<any, any>): string {
    const internal = replicationState.internalReplicationState;
    if (!internal) {
        return 'not started';
    }
    const checkpoint = internal.lastCheckpointDoc.down ?? internal.lastCheckpointDoc.up;
    if (!checkpoint || checkpoint.checkpointData === undefined) {
        return 'none yet';
    }
    try {
        return JSON.stringify(checkpoint.checkpointData);
    } catch (error) {
        return 'unreadable';
    }
}
