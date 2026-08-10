import { el, spacer } from '../dom.ts';
import { formatNumber } from '../format.ts';
import { DEVTOOL_COLORS } from '../theme.ts';
import type { DevtoolStore } from '../store.ts';
import type { DevtoolNavigation, DevtoolTool } from '../../../types/index.d.ts';

const TOOLS: { id: DevtoolTool; label: string; }[] = [
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
export function replicationGlyph(store: DevtoolStore, collectionName: string): ReplicationGlyph {
    const states = store.getReplicationStates(collectionName);
    if (states.length === 0) {
        return { glyph: '○', color: DEVTOOL_COLORS.fgDim, state: 'not configured' };
    }
    if (store.replicationErrors.has(collectionName)) {
        return { glyph: '▲', color: DEVTOOL_COLORS.danger, state: 'error' };
    }
    if (states.some(state => state.subjects.canceled.getValue())) {
        return { glyph: '■', color: DEVTOOL_COLORS.fgMuted, state: 'stopped' };
    }
    if (states.some(state => state.subjects.active.getValue())) {
        return { glyph: '●', color: DEVTOOL_COLORS.success, state: 'running' };
    }
    return { glyph: '○', color: DEVTOOL_COLORS.fgDim, state: 'idle' };
}

function isActive(navigation: DevtoolNavigation, candidate: DevtoolNavigation): boolean {
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
    store: DevtoolStore,
    onNavigate: (navigation: DevtoolNavigation) => void
): HTMLElement {
    const rail = el('div', { class: 'rxdt-rail' });
    const collectionNames = store.collectionNames;

    const item = (
        navigation: DevtoolNavigation,
        children: (Node | string | false)[]
    ) => el('div', {
        class: 'rxdt-rail-item' + (isActive(store.navigation, navigation) ? ' rxdt-active' : ''),
        onClick: () => onNavigate(navigation)
    }, children);

    rail.appendChild(el('div', { class: 'rxdt-rail-head', text: 'COLLECTIONS' }));
    if (collectionNames.length === 0) {
        rail.appendChild(el('div', {
            class: 'rxdt-rail-item rxdt-dim',
            style: { cursor: 'default' },
            text: 'none yet'
        }));
    }
    collectionNames.forEach(name => {
        rail.appendChild(item({ kind: 'collection', name }, [
            el('span', { class: 'rxdt-rail-label', text: name }),
            el('span', {
                class: 'rxdt-rail-count',
                text: formatNumber(store.getMetrics(name).documentCount)
            })
        ]));
    });

    const replicated = collectionNames.filter(name => store.getReplicationStates(name).length > 0);
    if (replicated.length > 0) {
        rail.appendChild(el('div', { class: 'rxdt-rail-head', text: 'REPLICATION' }));
        replicated.forEach(name => {
            const glyph = replicationGlyph(store, name);
            rail.appendChild(item({ kind: 'replication', name }, [
                el('span', { class: 'rxdt-rail-label', text: name }),
                el('span', {
                    style: { color: glyph.color, fontSize: '10px' },
                    title: glyph.state,
                    text: glyph.glyph
                })
            ]));
        });
    }

    rail.appendChild(el('div', { class: 'rxdt-rail-head', text: 'TOOLS' }));
    TOOLS.forEach(tool => {
        rail.appendChild(item({ kind: 'tool', tool: tool.id }, [
            el('span', { class: 'rxdt-rail-label', text: tool.label })
        ]));
    });

    rail.appendChild(spacer());
    rail.appendChild(el('div', {
        class: 'rxdt-rail-settings',
        text: 'Settings',
        onClick: () => onNavigate({ kind: 'settings' })
    }));
    return rail;
}
