/**
 * Design tokens and the single stylesheet of the devtool.
 * Everything is self contained, there are no external assets and no font files.
 */

export const DEVTOOL_COLORS = {
    pink: '#ED168F',
    pinkDeep: '#B2218B',
    purple: '#752A8A',
    purpleDeep: '#27022D',
    bgDark: '#0D0F18',
    bg: '#20293C',
    bgCode: '#282330',
    bgDrawer: '#10141F',
    activeSegment: '#2C3547',
    neutralBar: '#3A4256',
    fg: '#FFFFFF',
    fgMuted: '#B5B5B5',
    fgDim: '#6E7688',
    success: '#3ECF8E',
    danger: '#FD366E',
    warning: '#EBCB4B',
    info: '#199BF1',
    /**
     * Only used on the Live activity map for the push/pull particles.
     * It is not part of the RxDB brand palette.
     */
    replication: '#9B6BFF'
} as const;

export const DEVTOOL_GRADIENT = 'linear-gradient(90deg,#ED168F,#B2218B,#752A8A)';

export const DEVTOOL_FONT_UI = 'system-ui,\'Segoe UI\',Helvetica,Arial,sans-serif';
export const DEVTOOL_FONT_MONO = 'ui-monospace,Menlo,Consolas,monospace';

/**
 * Below this width the map and the tool panels do not fit,
 * the devtool switches to the stacked read-only layout.
 */
export const DEVTOOL_NARROW_BREAKPOINT = 640;

const C = DEVTOOL_COLORS;

export const DEVTOOL_CSS = `
.rxdt, .rxdt *, .rxdt *::before, .rxdt *::after { box-sizing: border-box; }
.rxdt {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: ${C.bgDark};
    color: ${C.fg};
    font-family: ${DEVTOOL_FONT_UI};
    font-size: 12px;
    letter-spacing: 0.01em;
    line-height: 1.4;
}
.rxdt button { font-family: inherit; border-radius: 0; cursor: pointer; }
.rxdt input, .rxdt textarea { border-radius: 0; }
.rxdt a { color: ${C.fg}; text-decoration: underline; text-decoration-color: ${C.pink}; text-decoration-thickness: 1.5px; text-underline-offset: 3px; cursor: pointer; }
.rxdt a:hover { color: ${C.pink}; }
.rxdt ::-webkit-scrollbar { width: 8px; height: 8px; }
.rxdt ::-webkit-scrollbar-thumb { background: ${C.activeSegment}; border-radius: 4px; }
.rxdt-mono { font-family: ${DEVTOOL_FONT_MONO}; }
.rxdt-grow { flex: 1; min-width: 0; }
.rxdt-dim { color: ${C.fgDim}; }
.rxdt-muted { color: ${C.fgMuted}; }
.rxdt-row { display: flex; align-items: center; }
.rxdt-hidden { display: none !important; }

/* ---------- buttons ---------- */
.rxdt-btn {
    border: 1px solid rgba(255,255,255,0.25);
    background: transparent;
    color: ${C.fg};
    font-size: 11px;
    padding: 4px 12px;
    transition: background 180ms ease-in-out, color 180ms ease-in-out, border-color 180ms ease-in-out;
}
.rxdt-btn:hover:not(:disabled) { background: ${C.fg}; color: ${C.bgDark}; }
.rxdt-btn:active:not(:disabled) { transform: translateY(1px); transition: transform 80ms ease; }
.rxdt-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rxdt-btn-sm { font-size: 10px; padding: 3px 10px; }
.rxdt-btn-primary {
    border: 0;
    background: ${DEVTOOL_GRADIENT};
    color: ${C.fg};
    font-weight: 700;
    font-size: 11px;
    padding: 6px 16px;
    transition: background 180ms ease-in-out;
}
.rxdt-btn-primary:hover:not(:disabled) { background: ${DEVTOOL_GRADIENT}; }
.rxdt-btn-primary:active:not(:disabled) { transform: translateY(1px); transition: transform 80ms ease; }
.rxdt-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.rxdt-btn-danger {
    border: 1px solid ${C.danger};
    background: transparent;
    color: ${C.danger};
    font-weight: 700;
    font-size: 11px;
    padding: 6px 14px;
    transition: background 180ms ease-in-out, color 180ms ease-in-out;
}
.rxdt-btn-danger:hover:not(:disabled) { background: ${C.danger}; color: ${C.fg}; }
.rxdt-btn-danger-solid { border: 0; background: ${C.danger}; color: ${C.fg}; font-weight: 700; font-size: 11px; padding: 6px 14px; }
.rxdt-btn-danger-solid:disabled { opacity: 0.5; cursor: not-allowed; }

/* ---------- top bar ---------- */
.rxdt-topbar {
    height: 44px;
    min-height: 44px;
    background: ${C.purpleDeep};
    border-bottom: 1px solid rgba(255,255,255,0.10);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 12px;
    font-size: 12px;
}
.rxdt-logo { width: 14px; height: 14px; border-radius: 50%; background: linear-gradient(135deg,${C.pink},${C.purple}); flex: none; }
.rxdt-wordmark { font-weight: 800; letter-spacing: 0.02em; }
.rxdt-topbar-divider { color: rgba(255,255,255,0.25); }
.rxdt-identity { font-family: ${DEVTOOL_FONT_MONO}; font-size: 11px; color: ${C.fgMuted}; }
.rxdt-cmdk {
    display: flex; align-items: center; gap: 8px;
    border: 1px solid rgba(255,255,255,0.20);
    padding: 3px 10px; font-size: 11px; color: ${C.fgMuted};
    font-family: ${DEVTOOL_FONT_MONO}; cursor: pointer;
    transition: border-color 180ms ease-in-out;
}
.rxdt-cmdk:hover { border-color: rgba(255,255,255,0.4); }
.rxdt-cmdk span { color: rgba(255,255,255,0.45); }
.rxdt-drag-handle { color: ${C.fgMuted}; cursor: grab; font-size: 13px; letter-spacing: 2px; user-select: none; }

/* ---------- banner ---------- */
.rxdt-banner { display: flex; align-items: center; gap: 10px; padding: 6px 12px; font-size: 11px; }
.rxdt-banner-connected { background: rgba(62,207,142,0.08); border-bottom: 1px solid rgba(62,207,142,0.35); }
.rxdt-banner-dump { background: rgba(235,203,75,0.08); border-bottom: 1px solid rgba(235,203,75,0.35); }

/* ---------- rail ---------- */
.rxdt-body { flex: 1; display: flex; min-height: 0; }
.rxdt-rail {
    width: 200px; min-width: 200px;
    background: ${C.bgDark};
    border-right: 1px solid rgba(255,255,255,0.10);
    display: flex; flex-direction: column;
    font-size: 11px; padding: 10px 0;
    overflow-y: auto;
}
.rxdt-rail-head { padding: 4px 12px; font-size: 10px; font-weight: 600; letter-spacing: 0.09em; color: ${C.fgDim}; }
.rxdt-rail-head + .rxdt-rail-head, .rxdt-rail-item + .rxdt-rail-head { padding-top: 14px; }
.rxdt-rail-item {
    display: flex; align-items: center; gap: 8px;
    padding: 4px 12px 4px 10px;
    border-left: 2px solid transparent;
    color: ${C.fgMuted}; cursor: pointer;
    transition: background 180ms ease-in-out, color 180ms ease-in-out;
}
.rxdt-rail-item:hover { background: rgba(255,255,255,0.05); }
.rxdt-rail-item.rxdt-active { border-left-color: ${C.pink}; background: rgba(237,22,143,0.10); color: ${C.fg}; }
.rxdt-rail-label { flex: 1; font-family: ${DEVTOOL_FONT_MONO}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rxdt-rail-count { color: ${C.fgDim}; font-family: ${DEVTOOL_FONT_MONO}; }
.rxdt-rail-settings { padding: 6px 12px; border-top: 1px solid rgba(255,255,255,0.08); color: ${C.fgMuted}; cursor: pointer; }
.rxdt-rail-settings:hover { color: ${C.fg}; }

/* ---------- main ---------- */
.rxdt-main { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.rxdt-scroll { flex: 1; overflow: auto; min-height: 0; }
.rxdt-toolbar {
    display: flex; align-items: center; gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex: none;
}
.rxdt-panel-title { font-weight: 700; font-size: 13px; }
.rxdt-seg { display: flex; border: 1px solid rgba(255,255,255,0.20); font-size: 11px; }
.rxdt-seg > div { padding: 3px 12px; color: ${C.fgMuted}; cursor: pointer; transition: background 180ms ease-in-out, color 180ms ease-in-out; }
.rxdt-seg > div + div { border-left: 1px solid rgba(255,255,255,0.20); }
.rxdt-seg > div:hover { color: ${C.fg}; }
.rxdt-seg > div.rxdt-active { background: ${C.activeSegment}; color: ${C.fg}; }
.rxdt-toggle {
    display: flex; align-items: center; gap: 6px;
    border: 1px solid rgba(255,255,255,0.20);
    padding: 3px 10px; font-size: 11px; color: ${C.fgMuted}; cursor: pointer;
    transition: border-color 180ms ease-in-out, color 180ms ease-in-out;
}
.rxdt-toggle:hover { color: ${C.fg}; }
.rxdt-toggle.rxdt-on { border-color: rgba(62,207,142,0.5); color: ${C.success}; }
.rxdt-dot { width: 7px; height: 7px; border-radius: 50%; background: ${C.fgDim}; flex: none; }
.rxdt-toggle.rxdt-on .rxdt-dot { background: ${C.success}; }
.rxdt-section-label { font-size: 9px; font-weight: 600; letter-spacing: 0.09em; color: ${C.fgDim}; text-transform: uppercase; }

/* ---------- query bar ---------- */
.rxdt-querybar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); position: relative; flex: none; }
.rxdt-query-input-wrap {
    flex: 1; display: flex; align-items: center; gap: 8px;
    background: ${C.bg}; border: 1px solid rgba(255,255,255,0.14);
    padding: 5px 10px; font-family: ${DEVTOOL_FONT_MONO}; font-size: 11.5px;
    transition: border-color 180ms ease-in-out;
}
.rxdt-query-input-wrap.rxdt-focus { border-color: ${C.pink}; }
.rxdt-query-input-wrap.rxdt-invalid { border-color: ${C.danger}; }
.rxdt-query-input {
    flex: 1; background: transparent; border: 0; outline: none;
    color: ${C.fg}; font-family: inherit; font-size: inherit; padding: 0;
}
.rxdt-history-btn { color: ${C.fgDim}; font-size: 10px; cursor: pointer; user-select: none; }
.rxdt-history-btn:hover { color: ${C.fg}; }
.rxdt-dropdown {
    position: absolute; top: 100%; left: 12px; right: 12px; z-index: 20;
    margin-top: 4px; background: ${C.bgCode};
    border: 1px solid rgba(255,255,255,0.14); font-size: 11px;
    max-height: 320px; overflow: auto;
}
.rxdt-dropdown-head { padding: 6px 10px 2px; font-size: 9px; font-weight: 600; letter-spacing: 0.09em; color: ${C.fgDim}; }
.rxdt-dropdown-head + .rxdt-dropdown-row { border-top: 0; }
.rxdt-dropdown-row { display: flex; gap: 10px; padding: 4px 10px; cursor: pointer; }
.rxdt-dropdown-row:hover, .rxdt-dropdown-row.rxdt-active { background: rgba(255,255,255,0.05); }
.rxdt-dropdown-row.rxdt-fav.rxdt-active { background: rgba(237,22,143,0.10); }
.rxdt-dropdown-name { width: 110px; color: ${C.fgMuted}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rxdt-dropdown-foot { padding: 5px 10px; border-top: 1px solid rgba(255,255,255,0.08); color: ${C.fgDim}; font-size: 10px; }
.rxdt-query-error { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); }

/* ---------- tables ---------- */
.rxdt-thead {
    display: grid; padding: 0 12px;
    border-bottom: 1px solid rgba(255,255,255,0.14);
    font-size: 10px; font-weight: 600; letter-spacing: 0.07em;
    text-transform: uppercase; color: ${C.fgDim};
    flex: none;
}
.rxdt-thead > div { padding: 5px 8px 5px 0; }
.rxdt-thead > div:last-child { padding-right: 0; }
.rxdt-thead > div.rxdt-sorted { color: ${C.fg}; }
.rxdt-th-click { cursor: pointer; }
.rxdt-tr {
    display: grid; padding: 0 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    font-size: 11px; cursor: pointer;
    transition: background 180ms ease-in-out;
}
.rxdt-tr > div { padding: 4px 8px 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rxdt-tr > div:last-child { padding-right: 0; }
.rxdt-tr:hover { background: rgba(255,255,255,0.04); }
.rxdt-tr.rxdt-selected { background: rgba(237,22,143,0.10); }
.rxdt-tr.rxdt-static { cursor: default; }
.rxdt-check { accent-color: ${C.pink}; width: 12px; height: 12px; margin: 0; cursor: pointer; }
.rxdt-cell-input {
    background: ${C.bg}; border: 1px solid ${C.pink}; color: ${C.fg};
    font-size: 11px; font-family: inherit; padding: 1px 6px; width: 90%; outline: none;
}
.rxdt-footer {
    display: flex; align-items: center; gap: 12px;
    padding: 6px 12px; border-top: 1px solid rgba(255,255,255,0.08);
    font-size: 11px; color: ${C.fgMuted}; flex: none;
}
.rxdt-pager { border: 1px solid rgba(255,255,255,0.20); background: transparent; color: ${C.fg}; font-size: 11px; padding: 2px 8px; }
.rxdt-pager:disabled { color: ${C.fgDim}; cursor: not-allowed; }
.rxdt-pager:hover:not(:disabled) { background: ${C.fg}; color: ${C.bgDark}; }

/* ---------- cards ---------- */
.rxdt-cards { display: flex; gap: 12px; padding: 14px 12px; flex-wrap: wrap; }
.rxdt-card { flex: 1; min-width: 160px; background: ${C.bg}; border: 1px solid rgba(255,255,255,0.10); padding: 10px 12px; }
.rxdt-card-value { font-family: ${DEVTOOL_FONT_MONO}; font-size: 13px; margin-top: 4px; }
.rxdt-note { border: 1px solid rgba(255,255,255,0.12); padding: 12px; margin: 16px 12px; max-width: 640px; }
.rxdt-callout { margin: 6px 12px; padding: 10px 12px; font-size: 11.5px; }
.rxdt-callout-warning { border: 1px solid rgba(235,203,75,0.4); background: rgba(235,203,75,0.06); }
.rxdt-callout-error { border: 1px solid rgba(253,54,110,0.4); background: rgba(253,54,110,0.06); }
.rxdt-callout-title { font-weight: 700; }
.rxdt-callout-body { color: ${C.fgMuted}; margin-top: 4px; line-height: 1.55; }
.rxdt-code {
    background: ${C.bgCode}; padding: 8px 12px;
    font-family: ${DEVTOOL_FONT_MONO}; font-size: 11px;
    white-space: pre; overflow: auto; line-height: 1.6;
}
.rxdt-code-inline { font-family: ${DEVTOOL_FONT_MONO}; color: ${C.fg}; background: ${C.bgCode}; padding: 1px 5px; }

/* ---------- json view ---------- */
.rxdt-json { flex: 1; overflow: auto; padding: 10px 14px; font-family: ${DEVTOOL_FONT_MONO}; font-size: 11px; line-height: 1.65; white-space: pre; }
.rxdt-json-key { color: ${C.fgDim}; }
.rxdt-json-string { color: ${C.success}; }
.rxdt-json-literal { color: ${C.warning}; }
.rxdt-json-doc { display: block; padding-left: 2ch; }
.rxdt-json-fresh { background: rgba(62,207,142,0.08); }

/* ---------- drawer ---------- */
.rxdt-drawer {
    width: 340px; min-width: 340px;
    border-left: 1px solid rgba(255,255,255,0.14);
    background: ${C.bgDrawer};
    display: flex; flex-direction: column;
    overflow: auto; font-size: 11px;
}
.rxdt-drawer-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); flex: none; }
.rxdt-badge { font-size: 9px; border: 1px solid rgba(237,22,143,0.5); color: ${C.pink}; padding: 1px 6px; }
.rxdt-badge-neutral { font-size: 9px; color: ${C.fgDim}; border: 1px solid rgba(255,255,255,0.15); padding: 0 4px; }
.rxdt-badge-warning { font-size: 9px; border: 1px solid rgba(235,203,75,0.5); color: ${C.warning}; padding: 0 5px; font-family: ${DEVTOOL_FONT_MONO}; }
.rxdt-badge-success { font-size: 9px; border: 1px solid rgba(62,207,142,0.5); color: ${C.success}; padding: 0 5px; font-family: ${DEVTOOL_FONT_MONO}; }
.rxdt-drawer-group { padding: 10px 12px 2px; font-size: 9px; font-weight: 600; letter-spacing: 0.09em; color: ${C.fgDim}; border-top: 1px solid rgba(255,255,255,0.08); margin-top: 8px; }
.rxdt-drawer-group-first { border-top: 0; margin-top: 0; padding-top: 8px; }
.rxdt-drawer-group-run { color: ${C.pink}; }
.rxdt-field { display: flex; gap: 8px; padding: 3px 12px; align-items: center; }
.rxdt-field-label { width: 80px; color: ${C.fgDim}; flex: none; cursor: default; }
.rxdt-field-label.rxdt-expandable { cursor: pointer; }
.rxdt-field-value { font-family: ${DEVTOOL_FONT_MONO}; color: ${C.fgMuted}; overflow: hidden; text-overflow: ellipsis; }
.rxdt-field-child { display: flex; gap: 8px; padding: 2px 12px 2px 28px; font-family: ${DEVTOOL_FONT_MONO}; }
.rxdt-field-child > span:first-child { color: ${C.fgDim}; width: 64px; flex: none; }
.rxdt-field-input {
    flex: 1; background: ${C.bg}; border: 1px solid rgba(255,255,255,0.14); color: ${C.fg};
    font-size: 11px; font-family: ${DEVTOOL_FONT_MONO}; padding: 2px 6px; outline: none;
    transition: border-color 180ms ease-in-out;
}
.rxdt-field-input.rxdt-edited { border-color: ${C.pink}; }
.rxdt-field-input:focus { border-color: ${C.pink}; }
.rxdt-edited-dot { width: 6px; height: 6px; border-radius: 50%; background: ${C.pink}; flex: none; }
.rxdt-will-run { margin: 4px 12px; background: ${C.bgCode}; padding: 8px 10px; font-family: ${DEVTOOL_FONT_MONO}; font-size: 10.5px; line-height: 1.6; white-space: pre; overflow: auto; }
.rxdt-will-run-changed { background: rgba(237,22,143,0.18); display: block; }
.rxdt-attachment { margin: 4px 12px; border: 1px solid rgba(255,255,255,0.12); }
.rxdt-attachment-head { display: flex; gap: 8px; padding: 4px 8px; align-items: center; }
.rxdt-attachment-preview { max-height: 160px; width: 100%; object-fit: contain; display: block; border-top: 1px solid rgba(255,255,255,0.08); background: ${C.bg}; }
.rxdt-close { color: ${C.fgDim}; cursor: pointer; font-size: 14px; line-height: 1; }
.rxdt-close:hover { color: ${C.fg}; }

/* ---------- modal ---------- */
.rxdt-modal-backdrop {
    position: absolute; inset: 0; z-index: 50;
    background: rgba(9,11,18,0.85);
    display: flex; align-items: center; justify-content: center;
}
.rxdt-modal { width: 440px; max-width: calc(100% - 32px); background: ${C.bg}; border: 1px solid rgba(255,255,255,0.20); border-top: 2px solid ${C.danger}; padding: 18px 20px; font-size: 12px; }
.rxdt-modal-title { font-weight: 700; font-size: 14px; }
.rxdt-modal-body { color: ${C.fgMuted}; margin-top: 8px; line-height: 1.55; font-size: 11.5px; }
.rxdt-modal-input {
    width: 100%; margin-top: 4px; background: ${C.bgDark};
    border: 1px solid rgba(255,255,255,0.20); color: ${C.fg};
    font-family: ${DEVTOOL_FONT_MONO}; font-size: 12px; padding: 6px 8px; outline: none;
}
.rxdt-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }

/* ---------- centered states ---------- */
.rxdt-center { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; min-height: 0; }
.rxdt-center-inner { width: 420px; max-width: 100%; text-align: center; }
.rxdt-center-title { font-weight: 800; font-size: 14px; }
.rxdt-center-body { color: ${C.fgMuted}; font-size: 11.5px; margin-top: 6px; line-height: 1.55; }
.rxdt-center-actions { display: flex; gap: 8px; justify-content: center; margin-top: 14px; }

/* ---------- live map ---------- */
.rxdt-map { flex: 1; display: flex; min-height: 0; padding: 14px 12px; overflow: auto; }
.rxdt-map-col { width: 186px; min-width: 186px; display: flex; flex-direction: column; gap: 8px; }
.rxdt-node { border: 1px solid rgba(255,255,255,0.12); background: ${C.bgDrawer}; padding: 9px 10px; }
.rxdt-node-app { border-color: rgba(255,255,255,0.20); background: ${C.bg}; }
.rxdt-node-clickable { cursor: pointer; transition: border-color 180ms ease-in-out; }
.rxdt-node-clickable:hover { border-color: rgba(255,255,255,0.35); }
.rxdt-node-dashed { border: 1px dashed rgba(255,255,255,0.16); padding: 8px 10px; opacity: 0.6; }
.rxdt-node-error { border-color: rgba(253,54,110,0.5); background: rgba(253,54,110,0.07); }
.rxdt-node-pulse { animation: rxdtNodePulse 250ms ease-out; }
.rxdt-map-rows { flex: 1; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.rxdt-map-row { display: flex; align-items: center; flex: 1; min-height: 0; }
.rxdt-lane { flex: 1; min-width: 70px; display: flex; flex-direction: column; gap: 9px; }
.rxdt-track { position: relative; height: 13px; }
.rxdt-track-line { position: absolute; top: 6px; left: 0; right: 0; height: 1px; background: rgba(255,255,255,0.10); }
.rxdt-track-line-thread { background: repeating-linear-gradient(90deg,rgba(25,155,241,0.55) 0 4px,transparent 4px 8px); animation: rxdtThread 1.2s linear infinite; }
.rxdt-track-line-error { background: repeating-linear-gradient(90deg,rgba(253,54,110,0.6) 0 4px,transparent 4px 8px); }
.rxdt-particle { position: absolute; top: -1px; font-family: ${DEVTOOL_FONT_MONO}; font-size: 12px; font-weight: 700; }
.rxdt-band { flex: 1; height: 9px; }
.rxdt-spark { display: flex; align-items: flex-end; gap: 1.5px; height: 26px; margin-top: 7px; }
.rxdt-spark > div { flex: 1; background: ${C.pink}; min-height: 1px; }
.rxdt-progress { height: 8px; background: ${C.bg}; margin-top: 9px; }
.rxdt-progress > div { height: 100%; background: ${C.warning}; }
.rxdt-map-summary { display: flex; align-items: center; gap: 18px; padding: 7px 12px; border-top: 1px solid rgba(255,255,255,0.10); font-size: 11px; font-family: ${DEVTOOL_FONT_MONO}; flex: none; flex-wrap: wrap; }
.rxdt-blink { animation: rxdtBlink 1.4s ease-in-out infinite; }
.rxdt-legend { display: flex; gap: 10px; font-size: 10px; font-family: ${DEVTOOL_FONT_MONO}; color: ${C.fgDim}; flex-wrap: wrap; }
.rxdt-idle-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05); opacity: 0.62; }
.rxdt-subpanel { position: absolute; inset: 0; z-index: 40; background: rgba(9,11,18,0.85); display: flex; align-items: center; justify-content: center; padding: 24px; }
.rxdt-subpanel-inner { width: 780px; max-width: 100%; max-height: 100%; overflow: auto; background: ${C.bgDark}; border: 1px solid rgba(255,255,255,0.14); }

/* ---------- schema ---------- */
.rxdt-typebar { display: flex; height: 10px; width: 240px; max-width: 100%; background: ${C.neutralBar}; }
.rxdt-swatch { display: inline-block; width: 8px; height: 8px; }

/* ---------- diff ---------- */
.rxdt-diff { padding: 10px 12px; font-family: ${DEVTOOL_FONT_MONO}; font-size: 11px; line-height: 1.7; white-space: pre; }
.rxdt-diff-del { background: rgba(253,54,110,0.14); color: ${C.danger}; display: block; }
.rxdt-diff-add { background: rgba(62,207,142,0.12); color: ${C.success}; display: block; }
.rxdt-detail { width: 460px; min-width: 460px; overflow: auto; background: ${C.bgDrawer}; }

/* ---------- connection ---------- */
.rxdt-stage { display: flex; gap: 10px; align-items: center; }
.rxdt-stage-glyph { width: 16px; flex: none; }

/* ---------- narrow ---------- */
.rxdt-narrow-header {
    height: 48px; min-height: 48px; background: ${C.purpleDeep};
    border-bottom: 1px solid rgba(255,255,255,0.10);
    display: flex; align-items: center; gap: 10px; padding: 0 14px; flex: none;
}
.rxdt-narrow .rxdt-narrow-row {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.06);
    min-height: 44px; cursor: pointer;
}
.rxdt-narrow { font-size: 13px; }
.rxdt-narrow-head { padding: 12px 14px 4px; font-size: 10px; font-weight: 600; letter-spacing: 0.09em; color: ${C.fgDim}; }
.rxdt-narrow-field { padding: 8px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.rxdt-narrow-field > div:first-child { color: ${C.fgDim}; font-size: 10px; }
.rxdt-back { color: ${C.fgMuted}; font-size: 16px; cursor: pointer; }

@keyframes rxdtFlowR { from { left: -2px; opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } to { left: 100%; opacity: 0; } }
@keyframes rxdtFlowL { from { left: 100%; opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } to { left: -2px; opacity: 0; } }
@keyframes rxdtBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
@keyframes rxdtBand { from { background-position: 0 0; } to { background-position: 24px 0; } }
@keyframes rxdtNodePulse { 0% { border-color: rgba(255,255,255,0.45); } 100% { border-color: rgba(255,255,255,0.12); } }
@keyframes rxdtThread { from { background-position: 0 0; } to { background-position: -16px 0; } }

@media (prefers-reduced-motion: reduce) {
    .rxdt-particle, .rxdt-band, .rxdt-blink, .rxdt-node-pulse, .rxdt-track-line-thread { animation: none !important; }
}
`;
