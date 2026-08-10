import { button, el, primaryButton } from '../dom.ts';
import { DEVTOOL_COLORS } from '../theme.ts';
import type { DevtoolConnection, DevtoolConnectionStage } from '../../../types/index.d.ts';

/**
 * Connecting and failing are full screens, not toasts,
 * because they are the only thing the user can act on at that moment.
 */
export function renderConnectingScreen(
    connection: Extract<DevtoolConnection, { state: 'connecting'; }>,
    onCancel: () => void
): HTMLElement {
    return el('div', { class: 'rxdt-center' }, [
        el('div', { style: { width: '420px', maxWidth: '100%' } }, [
            el('div', { class: 'rxdt-row', style: { gap: '10px' } }, [
                el('div', { class: 'rxdt-logo', style: { width: '16px', height: '16px' } }),
                el('span', { style: { fontWeight: '800', fontSize: '15px' }, text: 'Connecting to remote database' })
            ]),
            el('div', { class: 'rxdt-muted', style: { fontSize: '11.5px', marginTop: '6px' } }, [
                connection.pairingCode
                    ? el('span', {}, [
                        document.createTextNode('Pairing code '),
                        el('span', { class: 'rxdt-mono', style: { color: DEVTOOL_COLORS.fg }, text: connection.pairingCode }),
                        document.createTextNode(' · usually under 10 seconds')
                    ])
                    : el('span', { text: 'Usually under 10 seconds' })
            ]),
            el('div', {
                style: { marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }
            }, connection.stages.map((stage, index) => renderStage(
                stage,
                index < connection.currentStage ? 'done' : (index === connection.currentStage ? 'current' : 'pending'),
                index === connection.currentStage && connection.elapsedSeconds !== undefined
                    ? connection.elapsedSeconds + 's'
                    : undefined
            ))),
            el('div', {
                class: 'rxdt-dim',
                style: { marginTop: '18px', fontSize: '10.5px', lineHeight: '1.55' },
                text: 'Restrictive networks can block peer-to-peer traffic. If this stalls past 30 seconds it fails with a diagnosis, it will not retry silently.'
            }),
            el('div', { style: { marginTop: '14px' } }, [button('Cancel', onCancel)])
        ])
    ]);
}

export function renderFailedScreen(
    connection: Extract<DevtoolConnection, { state: 'failed'; }>,
    onOpenDump: (() => void) | undefined
): HTMLElement {
    const failedStage = connection.stages[connection.failedStage];
    return el('div', { class: 'rxdt-center' }, [
        el('div', { style: { width: '480px', maxWidth: '100%' } }, [
            el('div', { class: 'rxdt-row', style: { gap: '10px' } }, [
                el('span', {
                    style: {
                        width: '18px',
                        height: '18px',
                        background: 'rgba(253,54,110,0.15)',
                        border: '1px solid ' + DEVTOOL_COLORS.danger,
                        color: DEVTOOL_COLORS.danger,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px'
                    },
                    text: '✕'
                }),
                el('span', { style: { fontWeight: '800', fontSize: '15px' }, text: 'Peer connection failed' })
            ]),
            el('div', {
                class: 'rxdt-muted',
                style: { fontSize: '11.5px', marginTop: '6px' },
                text: 'Failed at step ' + (connection.failedStage + 1) + ' of ' + connection.stages.length +
                    (failedStage ? ' — ' + failedStage.label.toLowerCase() : '') + '.'
            }),
            el('div', {
                style: { marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }
            }, connection.stages.map((stage, index) => renderStage(
                stage,
                index < connection.failedStage ? 'done' : (index === connection.failedStage ? 'failed' : 'pending')
            ))),
            el('div', {
                style: {
                    marginTop: '14px',
                    border: '1px solid rgba(253,54,110,0.4)',
                    background: 'rgba(253,54,110,0.06)',
                    padding: '10px 12px',
                    fontSize: '11.5px',
                    lineHeight: '1.55',
                    color: DEVTOOL_COLORS.fgMuted
                },
                text: connection.diagnosis
            }),
            el('div', {
                style: { marginTop: '12px', border: '1px solid rgba(255,255,255,0.14)', padding: '10px 12px' }
            }, [
                el('div', { style: { fontWeight: '700', fontSize: '12px' }, text: 'Work from an export instead' }),
                el('div', {
                    class: 'rxdt-muted',
                    style: { fontSize: '11px', marginTop: '4px', lineHeight: '1.55' }
                }, [
                    document.createTextNode('On the device, run '),
                    el('span', { class: 'rxdt-code-inline', text: 'await db.exportJSON()' }),
                    document.createTextNode(', save the result, and open it here. Read-only, frozen at export time.')
                ]),
                el('div', { class: 'rxdt-row', style: { gap: '10px', marginTop: '10px' } }, [
                    primaryButton('Open dump file…', () => onOpenDump?.(), { disabled: !onOpenDump }),
                    el('a', {
                        href: 'https://rxdb.info/json-dump.html',
                        target: '_blank',
                        rel: 'noopener',
                        style: { fontSize: '11px' },
                        text: 'How to export a dump'
                    })
                ])
            ])
        ])
    ]);
}

function renderStage(
    stage: DevtoolConnectionStage,
    state: 'done' | 'current' | 'failed' | 'pending',
    detail?: string
): HTMLElement {
    const glyphs = { done: '✓', current: '●', failed: '✕', pending: '○' };
    const colors = {
        done: DEVTOOL_COLORS.success,
        current: DEVTOOL_COLORS.pink,
        failed: DEVTOOL_COLORS.danger,
        pending: DEVTOOL_COLORS.fgDim
    };
    return el('div', {
        class: 'rxdt-stage',
        style: state === 'pending' ? { color: DEVTOOL_COLORS.fgDim } : {}
    }, [
        el('span', { class: 'rxdt-stage-glyph', style: { color: colors[state] }, text: glyphs[state] }),
        el('span', {
            style: (state === 'current' || state === 'failed') ? { fontWeight: '700' } : {},
            text: stage.label
        }),
        stage.detail && el('span', { class: 'rxdt-dim', style: { fontSize: '10px' }, text: stage.detail }),
        detail && el('span', { class: 'rxdt-dim', style: { fontSize: '10px' }, text: detail })
    ]);
}
