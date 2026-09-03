import { el, spacer } from '../dom.ts';
import { formatNumber } from '../format.ts';
import { DB_VIEWER_COLORS } from '../theme.ts';
import type { DbViewerStore } from '../store.ts';
import type { DbViewerNavigation, DbViewerTool } from '../../../types/index.d.ts';

const TOOLS: { id: DbViewerTool; label: string; }[] = [
    { id: 'live', label: 'Live' },
    { id: 'schema', label: 'Schema' },
    { id: 'changes', label: 'Changes' },
    { id: 'querylab', label: 'Query lab' },
    { id: 'storage', label: 'Storage' }
];

export type ReplicationGlyph = {
    glyph: string;
    color: string;
    state: string;
};

/**
 * ● running, ○ idle, ▲ error, ■ stopped.
 * The glyph carries the state so colour is never the only signal.
 */
export function replicationGlyph(store: DbViewerStore, collectionName: string): ReplicationGlyph {
    const states = store.getReplicationStates(collectionName);
    if (states.length === 0) {
        return { glyph: '○', color: DB_VIEWER_COLORS.fgDim, state: 'not configured' };
    }
    if (store.replicationErrors.has(collectionName)) {
        return { glyph: '▲', color: DB_VIEWER_COLORS.danger, state: 'error' };
    }
    if (states.some(state => state.subjects.canceled.getValue())) {
        return { glyph: '■', color: DB_VIEWER_COLORS.fgMuted, state: 'stopped' };
    }
    if (states.some(state => state.subjects.active.getValue())) {
        return { glyph: '●', color: DB_VIEWER_COLORS.success, state: 'running' };
    }
    return { glyph: '○', color: DB_VIEWER_COLORS.fgDim, state: 'idle' };
}

function isActive(navigation: DbViewerNavigation, candidate: DbViewerNavigation): boolean {
    if (navigation.kind !== candidate.kind) {
        return false;
    }
    if (navigation.kind === 'collection' && candidate.kind === 'collection') {
        return navigation.name === candidate.name;
    }
    if (navigation.kind === 'replication' && candidate.kind === 'replication') {
        return navigation.name === candidate.name;
    }
    if (navigation.kind === 'tool' && candidate.kind === 'tool') {
        return navigation.tool === candidate.tool;
    }
    return true;
}

export function renderRail(
    store: DbViewerStore,
    onNavigate: (navigation: DbViewerNavigation) => void
): HTMLElement {
    const rail = el('div', { class: 'rxdbv-rail' });
    const collectionNames = store.collectionNames;

    const item = (
        navigation: DbViewerNavigation,
        children: (Node | string | false)[]
    ) => el('div', {
        class: 'rxdbv-rail-item' + (isActive(store.navigation, navigation) ? ' rxdbv-active' : ''),
        onClick: () => onNavigate(navigation)
    }, children);

    rail.appendChild(el('div', { class: 'rxdbv-rail-head', text: 'COLLECTIONS' }));
    if (collectionNames.length === 0) {
        rail.appendChild(el('div', {
            class: 'rxdbv-rail-item rxdbv-dim',
            style: { cursor: 'default' },
            text: 'none yet'
        }));
    }
    collectionNames.forEach(name => {
        rail.appendChild(item({ kind: 'collection', name }, [
            el('span', { class: 'rxdbv-rail-label', text: name }),
            el('span', {
                class: 'rxdbv-rail-count',
                text: formatNumber(store.getMetrics(name).documentCount)
            })
        ]));
    });

    const replicated = collectionNames.filter(name => store.getReplicationStates(name).length > 0);
    if (replicated.length > 0) {
        rail.appendChild(el('div', { class: 'rxdbv-rail-head', text: 'REPLICATION' }));
        replicated.forEach(name => {
            const glyph = replicationGlyph(store, name);
            rail.appendChild(item({ kind: 'replication', name }, [
                el('span', { class: 'rxdbv-rail-label', text: name }),
                el('span', {
                    style: { color: glyph.color, fontSize: '10px' },
                    title: glyph.state,
                    text: glyph.glyph
                })
            ]));
        });
    }

    rail.appendChild(el('div', { class: 'rxdbv-rail-head', text: 'TOOLS' }));
    TOOLS.forEach(tool => {
        rail.appendChild(item({ kind: 'tool', tool: tool.id }, [
            el('span', { class: 'rxdbv-rail-label', text: tool.label })
        ]));
    });

    rail.appendChild(spacer());
    rail.appendChild(el('div', {
        class: 'rxdbv-rail-settings',
        text: 'Settings',
        onClick: () => onNavigate({ kind: 'settings' })
    }));
    return rail;
}
