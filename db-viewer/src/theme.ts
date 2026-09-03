/**
 * Design tokens and the single stylesheet of the database viewer.
 * Everything is self contained, there are no external assets and no font files.
 */

export const DB_VIEWER_COLORS = {
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

export const DB_VIEWER_GRADIENT = 'linear-gradient(90deg,#ED168F,#B2218B,#752A8A)';

export const DB_VIEWER_FONT_UI = 'system-ui,\'Segoe UI\',Helvetica,Arial,sans-serif';
export const DB_VIEWER_FONT_MONO = 'ui-monospace,Menlo,Consolas,monospace';

/**
 * Below this width the map and the tool panels do not fit,
 * the database viewer switches to the stacked read-only layout.
 */
export const DB_VIEWER_NARROW_BREAKPOINT = 640;

const C = DB_VIEWER_COLORS;

export const DB_VIEWER_CSS = `
.rxdbv, .rxdbv *, .rxdbv *::before, .rxdbv *::after { box-sizing: border-box; }
.rxdbv {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: ${C.bgDark};
    color: ${C.fg};
    font-family: ${DB_VIEWER_FONT_UI};
    font-size: 12px;
    letter-spacing: 0.01em;
    line-height: 1.4;
}
.rxdbv button { font-family: inherit; border-radius: 0; cursor: pointer; }
.rxdbv input, .rxdbv textarea { border-radius: 0; }
.rxdbv a { color: ${C.fg}; text-decoration: underline; text-decoration-color: ${C.pink}; text-decoration-thickness: 1.5px; text-underline-offset: 3px; cursor: pointer; }
.rxdbv a:hover { color: ${C.pink}; }
.rxdbv ::-webkit-scrollbar { width: 8px; height: 8px; }
.rxdbv ::-webkit-scrollbar-thumb { background: ${C.activeSegment}; border-radius: 4px; }
.rxdbv-mono { font-family: ${DB_VIEWER_FONT_MONO}; }
.rxdbv-grow { flex: 1; min-width: 0; }
.rxdbv-dim { color: ${C.fgDim}; }
.rxdbv-muted { color: ${C.fgMuted}; }
.rxdbv-row { display: flex; align-items: center; }
.rxdbv-hidden { display: none !important; }

/* ---------- buttons ---------- */
.rxdbv-btn {
    border: 1px solid rgba(255,255,255,0.25);
    background: transparent;
    color: ${C.fg};
    font-size: 11px;
    padding: 4px 12px;
    transition: background 180ms ease-in-out, color 180ms ease-in-out, border-color 180ms ease-in-out;
}
.rxdbv-btn:hover:not(:disabled) { background: ${C.fg}; color: ${C.bgDark}; }
.rxdbv-btn:active:not(:disabled) { transform: translateY(1px); transition: transform 80ms ease; }
.rxdbv-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rxdbv-btn-sm { font-size: 10px; padding: 3px 10px; }
.rxdbv-btn-primary {
    border: 0;
    background: ${DB_VIEWER_GRADIENT};
    color: ${C.fg};
    font-weight: 700;
    font-size: 11px;
    padding: 6px 16px;
    transition: background 180ms ease-in-out;
}
.rxdbv-btn-primary:hover:not(:disabled) { background: ${DB_VIEWER_GRADIENT}; }
.rxdbv-btn-primary:active:not(:disabled) { transform: translateY(1px); transition: transform 80ms ease; }
.rxdbv-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.rxdbv-btn-danger {
    border: 1px solid ${C.danger};
    background: transparent;
    color: ${C.danger};
    font-weight: 700;
    font-size: 11px;
    padding: 6px 14px;
    transition: background 180ms ease-in-out, color 180ms ease-in-out;
}
.rxdbv-btn-danger:hover:not(:disabled) { background: ${C.danger}; color: ${C.fg}; }
.rxdbv-btn-danger-solid { border: 0; background: ${C.danger}; color: ${C.fg}; font-weight: 700; font-size: 11px; padding: 6px 14px; }
.rxdbv-btn-danger-solid:disabled { opacity: 0.5; cursor: not-allowed; }

/* ---------- top bar ---------- */
.rxdbv-topbar {
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
.rxdbv-logo { width: 14px; height: 14px; border-radius: 50%; background: linear-gradient(135deg,${C.pink},${C.purple}); flex: none; }
.rxdbv-wordmark { font-weight: 800; letter-spacing: 0.02em; }
.rxdbv-topbar-divider { color: rgba(255,255,255,0.25); }
.rxdbv-identity { font-family: ${DB_VIEWER_FONT_MONO}; font-size: 11px; color: ${C.fgMuted}; }
.rxdbv-cmdk {
    display: flex; align-items: center; gap: 8px;
    border: 1px solid rgba(255,255,255,0.20);
    padding: 3px 10px; font-size: 11px; color: ${C.fgMuted};
    font-family: ${DB_VIEWER_FONT_MONO}; cursor: pointer;
    transition: border-color 180ms ease-in-out;
}
.rxdbv-cmdk:hover { border-color: rgba(255,255,255,0.4); }
.rxdbv-cmdk span { color: rgba(255,255,255,0.45); }
.rxdbv-drag-handle { color: ${C.fgMuted}; cursor: grab; font-size: 13px; letter-spacing: 2px; user-select: none; }

/* ---------- banner ---------- */
.rxdbv-banner { display: flex; align-items: center; gap: 10px; padding: 6px 12px; font-size: 11px; }
.rxdbv-banner-connected { background: rgba(62,207,142,0.08); border-bottom: 1px solid rgba(62,207,142,0.35); }
.rxdbv-banner-dump { background: rgba(235,203,75,0.08); border-bottom: 1px solid rgba(235,203,75,0.35); }

/* ---------- rail ---------- */
.rxdbv-body { flex: 1; display: flex; min-height: 0; }
.rxdbv-rail {
    width: 200px; min-width: 200px;
    background: ${C.bgDark};
    border-right: 1px solid rgba(255,255,255,0.10);
    display: flex; flex-direction: column;
    font-size: 11px; padding: 10px 0;
    overflow-y: auto;
}
.rxdbv-rail-head { padding: 4px 12px; font-size: 10px; font-weight: 600; letter-spacing: 0.09em; color: ${C.fgDim}; }
.rxdbv-rail-head + .rxdbv-rail-head, .rxdbv-rail-item + .rxdbv-rail-head { padding-top: 14px; }
.rxdbv-rail-item {
    display: flex; align-items: center; gap: 8px;
    padding: 4px 12px 4px 10px;
    border-left: 2px solid transparent;
    color: ${C.fgMuted}; cursor: pointer;
    transition: background 180ms ease-in-out, color 180ms ease-in-out;
}
.rxdbv-rail-item:hover { background: rgba(255,255,255,0.05); }
.rxdbv-rail-item.rxdbv-active { border-left-color: ${C.pink}; background: rgba(237,22,143,0.10); color: ${C.fg}; }
.rxdbv-rail-label { flex: 1; font-family: ${DB_VIEWER_FONT_MONO}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rxdbv-rail-count { color: ${C.fgDim}; font-family: ${DB_VIEWER_FONT_MONO}; }
.rxdbv-rail-settings { padding: 6px 12px; border-top: 1px solid rgba(255,255,255,0.08); color: ${C.fgMuted}; cursor: pointer; }
.rxdbv-rail-settings:hover { color: ${C.fg}; }

/* ---------- main ---------- */
.rxdbv-main { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.rxdbv-scroll { flex: 1; overflow: auto; min-height: 0; }
.rxdbv-toolbar {
    display: flex; align-items: center; gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex: none;
}
.rxdbv-panel-title { font-weight: 700; font-size: 13px; }
.rxdbv-seg { display: flex; border: 1px solid rgba(255,255,255,0.20); font-size: 11px; }
.rxdbv-seg > div { padding: 3px 12px; color: ${C.fgMuted}; cursor: pointer; transition: background 180ms ease-in-out, color 180ms ease-in-out; }
.rxdbv-seg > div + div { border-left: 1px solid rgba(255,255,255,0.20); }
.rxdbv-seg > div:hover { color: ${C.fg}; }
.rxdbv-seg > div.rxdbv-active { background: ${C.activeSegment}; color: ${C.fg}; }
.rxdbv-toggle {
    display: flex; align-items: center; gap: 6px;
    border: 1px solid rgba(255,255,255,0.20);
    padding: 3px 10px; font-size: 11px; color: ${C.fgMuted}; cursor: pointer;
    transition: border-color 180ms ease-in-out, color 180ms ease-in-out;
}
.rxdbv-toggle:hover { color: ${C.fg}; }
.rxdbv-toggle.rxdbv-on { border-color: rgba(62,207,142,0.5); color: ${C.success}; }
.rxdbv-dot { width: 7px; height: 7px; border-radius: 50%; background: ${C.fgDim}; flex: none; }
.rxdbv-toggle.rxdbv-on .rxdbv-dot { background: ${C.success}; }
.rxdbv-section-label { font-size: 9px; font-weight: 600; letter-spacing: 0.09em; color: ${C.fgDim}; text-transform: uppercase; }

/* ---------- query bar ---------- */
.rxdbv-querybar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); position: relative; flex: none; }
.rxdbv-query-input-wrap {
    flex: 1; display: flex; align-items: center; gap: 8px;
    background: ${C.bg}; border: 1px solid rgba(255,255,255,0.14);
    padding: 5px 10px; font-family: ${DB_VIEWER_FONT_MONO}; font-size: 11.5px;
    transition: border-color 180ms ease-in-out;
}
.rxdbv-query-input-wrap.rxdbv-focus { border-color: ${C.pink}; }
.rxdbv-query-input-wrap.rxdbv-invalid { border-color: ${C.danger}; }
.rxdbv-query-input {
    flex: 1; background: transparent; border: 0; outline: none;
    color: ${C.fg}; font-family: inherit; font-size: inherit; padding: 0;
}
.rxdbv-history-btn { color: ${C.fgDim}; font-size: 10px; cursor: pointer; user-select: none; }
.rxdbv-history-btn:hover { color: ${C.fg}; }
.rxdbv-dropdown {
    position: absolute; top: 100%; left: 12px; right: 12px; z-index: 20;
    margin-top: 4px; background: ${C.bgCode};
    border: 1px solid rgba(255,255,255,0.14); font-size: 11px;
    max-height: 320px; overflow: auto;
}
.rxdbv-dropdown-head { padding: 6px 10px 2px; font-size: 9px; font-weight: 600; letter-spacing: 0.09em; color: ${C.fgDim}; }
.rxdbv-dropdown-head + .rxdbv-dropdown-row { border-top: 0; }
.rxdbv-dropdown-row { display: flex; gap: 10px; padding: 4px 10px; cursor: pointer; }
.rxdbv-dropdown-row:hover, .rxdbv-dropdown-row.rxdbv-active { background: rgba(255,255,255,0.05); }
.rxdbv-dropdown-row.rxdbv-fav.rxdbv-active { background: rgba(237,22,143,0.10); }
.rxdbv-dropdown-name { width: 110px; color: ${C.fgMuted}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rxdbv-dropdown-foot { padding: 5px 10px; border-top: 1px solid rgba(255,255,255,0.08); color: ${C.fgDim}; font-size: 10px; }
.rxdbv-query-error { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); }

/* ---------- tables ---------- */
.rxdbv-thead {
    display: grid; padding: 0 12px;
    border-bottom: 1px solid rgba(255,255,255,0.14);
    font-size: 10px; font-weight: 600; letter-spacing: 0.07em;
    text-transform: uppercase; color: ${C.fgDim};
    flex: none;
}
.rxdbv-thead > div { padding: 5px 8px 5px 0; }
.rxdbv-thead > div:last-child { padding-right: 0; }
.rxdbv-thead > div.rxdbv-sorted { color: ${C.fg}; }
.rxdbv-th-click { cursor: pointer; }
.rxdbv-tr {
    display: grid; padding: 0 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    font-size: 11px; cursor: pointer;
    transition: background 180ms ease-in-out;
}
.rxdbv-tr > div { padding: 4px 8px 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rxdbv-tr > div:last-child { padding-right: 0; }
.rxdbv-tr:hover { background: rgba(255,255,255,0.04); }
.rxdbv-tr.rxdbv-selected { background: rgba(237,22,143,0.10); }
.rxdbv-tr.rxdbv-static { cursor: default; }
.rxdbv-check { accent-color: ${C.pink}; width: 12px; height: 12px; margin: 0; cursor: pointer; }
.rxdbv-cell-input {
    background: ${C.bg}; border: 1px solid ${C.pink}; color: ${C.fg};
    font-size: 11px; font-family: inherit; padding: 1px 6px; width: 90%; outline: none;
}
.rxdbv-footer {
    display: flex; align-items: center; gap: 12px;
    padding: 6px 12px; border-top: 1px solid rgba(255,255,255,0.08);
    font-size: 11px; color: ${C.fgMuted}; flex: none;
}
.rxdbv-pager { border: 1px solid rgba(255,255,255,0.20); background: transparent; color: ${C.fg}; font-size: 11px; padding: 2px 8px; }
.rxdbv-pager:disabled { color: ${C.fgDim}; cursor: not-allowed; }
.rxdbv-pager:hover:not(:disabled) { background: ${C.fg}; color: ${C.bgDark}; }

/* ---------- cards ---------- */
.rxdbv-cards { display: flex; gap: 12px; padding: 14px 12px; flex-wrap: wrap; }
.rxdbv-card { flex: 1; min-width: 160px; background: ${C.bg}; border: 1px solid rgba(255,255,255,0.10); padding: 10px 12px; }
.rxdbv-card-value { font-family: ${DB_VIEWER_FONT_MONO}; font-size: 13px; margin-top: 4px; }
.rxdbv-note { border: 1px solid rgba(255,255,255,0.12); padding: 12px; margin: 16px 12px; max-width: 640px; }
.rxdbv-callout { margin: 6px 12px; padding: 10px 12px; font-size: 11.5px; }
.rxdbv-callout-warning { border: 1px solid rgba(235,203,75,0.4); background: rgba(235,203,75,0.06); }
.rxdbv-callout-error { border: 1px solid rgba(253,54,110,0.4); background: rgba(253,54,110,0.06); }
.rxdbv-callout-title { font-weight: 700; }
.rxdbv-callout-body { color: ${C.fgMuted}; margin-top: 4px; line-height: 1.55; }
.rxdbv-code {
    background: ${C.bgCode}; padding: 8px 12px;
    font-family: ${DB_VIEWER_FONT_MONO}; font-size: 11px;
    white-space: pre; overflow: auto; line-height: 1.6;
}
.rxdbv-code-inline { font-family: ${DB_VIEWER_FONT_MONO}; color: ${C.fg}; background: ${C.bgCode}; padding: 1px 5px; }

/* ---------- json view ---------- */
.rxdbv-json { flex: 1; overflow: auto; padding: 10px 14px; font-family: ${DB_VIEWER_FONT_MONO}; font-size: 11px; line-height: 1.65; white-space: pre; }
.rxdbv-json-key { color: ${C.fgDim}; }
.rxdbv-json-string { color: ${C.success}; }
.rxdbv-json-literal { color: ${C.warning}; }
.rxdbv-json-doc { display: block; padding-left: 2ch; }
.rxdbv-json-fresh { background: rgba(62,207,142,0.08); }

/* ---------- drawer ---------- */
.rxdbv-drawer {
    width: 340px; min-width: 340px;
    border-left: 1px solid rgba(255,255,255,0.14);
    background: ${C.bgDrawer};
    display: flex; flex-direction: column;
    overflow: auto; font-size: 11px;
}
.rxdbv-drawer-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); flex: none; }
.rxdbv-badge { font-size: 9px; border: 1px solid rgba(237,22,143,0.5); color: ${C.pink}; padding: 1px 6px; }
.rxdbv-badge-neutral { font-size: 9px; color: ${C.fgDim}; border: 1px solid rgba(255,255,255,0.15); padding: 0 4px; }
.rxdbv-badge-warning { font-size: 9px; border: 1px solid rgba(235,203,75,0.5); color: ${C.warning}; padding: 0 5px; font-family: ${DB_VIEWER_FONT_MONO}; }
.rxdbv-badge-success { font-size: 9px; border: 1px solid rgba(62,207,142,0.5); color: ${C.success}; padding: 0 5px; font-family: ${DB_VIEWER_FONT_MONO}; }
.rxdbv-drawer-group { padding: 10px 12px 2px; font-size: 9px; font-weight: 600; letter-spacing: 0.09em; color: ${C.fgDim}; border-top: 1px solid rgba(255,255,255,0.08); margin-top: 8px; }
.rxdbv-drawer-group-first { border-top: 0; margin-top: 0; padding-top: 8px; }
.rxdbv-drawer-group-run { color: ${C.pink}; }
.rxdbv-field { display: flex; gap: 8px; padding: 3px 12px; align-items: center; }
.rxdbv-field-label { width: 80px; color: ${C.fgDim}; flex: none; cursor: default; }
.rxdbv-field-label.rxdbv-expandable { cursor: pointer; }
.rxdbv-field-value { font-family: ${DB_VIEWER_FONT_MONO}; color: ${C.fgMuted}; overflow: hidden; text-overflow: ellipsis; }
.rxdbv-field-child { display: flex; gap: 8px; padding: 2px 12px 2px 28px; font-family: ${DB_VIEWER_FONT_MONO}; }
.rxdbv-field-child > span:first-child { color: ${C.fgDim}; width: 64px; flex: none; }
.rxdbv-field-input {
    flex: 1; background: ${C.bg}; border: 1px solid rgba(255,255,255,0.14); color: ${C.fg};
    font-size: 11px; font-family: ${DB_VIEWER_FONT_MONO}; padding: 2px 6px; outline: none;
    transition: border-color 180ms ease-in-out;
}
.rxdbv-field-input.rxdbv-edited { border-color: ${C.pink}; }
.rxdbv-field-input:focus { border-color: ${C.pink}; }
.rxdbv-edited-dot { width: 6px; height: 6px; border-radius: 50%; background: ${C.pink}; flex: none; }
.rxdbv-will-run { margin: 4px 12px; background: ${C.bgCode}; padding: 8px 10px; font-family: ${DB_VIEWER_FONT_MONO}; font-size: 10.5px; line-height: 1.6; white-space: pre; overflow: auto; }
.rxdbv-will-run-changed { background: rgba(237,22,143,0.18); display: block; }
.rxdbv-attachment { margin: 4px 12px; border: 1px solid rgba(255,255,255,0.12); }
.rxdbv-attachment-head { display: flex; gap: 8px; padding: 4px 8px; align-items: center; }
.rxdbv-attachment-preview { max-height: 160px; width: 100%; object-fit: contain; display: block; border-top: 1px solid rgba(255,255,255,0.08); background: ${C.bg}; }
.rxdbv-close { color: ${C.fgDim}; cursor: pointer; font-size: 14px; line-height: 1; }
.rxdbv-close:hover { color: ${C.fg}; }

/* ---------- modal ---------- */
.rxdbv-modal-backdrop {
    position: absolute; inset: 0; z-index: 50;
    background: rgba(9,11,18,0.85);
    display: flex; align-items: center; justify-content: center;
}
.rxdbv-modal { width: 440px; max-width: calc(100% - 32px); background: ${C.bg}; border: 1px solid rgba(255,255,255,0.20); border-top: 2px solid ${C.danger}; padding: 18px 20px; font-size: 12px; }
.rxdbv-modal-title { font-weight: 700; font-size: 14px; }
.rxdbv-modal-body { color: ${C.fgMuted}; margin-top: 8px; line-height: 1.55; font-size: 11.5px; }
.rxdbv-modal-input {
    width: 100%; margin-top: 4px; background: ${C.bgDark};
    border: 1px solid rgba(255,255,255,0.20); color: ${C.fg};
    font-family: ${DB_VIEWER_FONT_MONO}; font-size: 12px; padding: 6px 8px; outline: none;
}
.rxdbv-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }

/* ---------- centered states ---------- */
.rxdbv-center { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; min-height: 0; }
.rxdbv-center-inner { width: 420px; max-width: 100%; text-align: center; }
.rxdbv-center-title { font-weight: 800; font-size: 14px; }
.rxdbv-center-body { color: ${C.fgMuted}; font-size: 11.5px; margin-top: 6px; line-height: 1.55; }
.rxdbv-center-actions { display: flex; gap: 8px; justify-content: center; margin-top: 14px; }

/* ---------- live map ---------- */
.rxdbv-map { flex: 1; display: flex; min-height: 0; padding: 14px 12px; overflow: auto; }
.rxdbv-map-col { width: 186px; min-width: 186px; display: flex; flex-direction: column; gap: 8px; }
.rxdbv-node { border: 1px solid rgba(255,255,255,0.12); background: ${C.bgDrawer}; padding: 9px 10px; }
.rxdbv-node-app { border-color: rgba(255,255,255,0.20); background: ${C.bg}; }
.rxdbv-node-clickable { cursor: pointer; transition: border-color 180ms ease-in-out; }
.rxdbv-node-clickable:hover { border-color: rgba(255,255,255,0.35); }
.rxdbv-node-dashed { border: 1px dashed rgba(255,255,255,0.16); padding: 8px 10px; opacity: 0.6; }
.rxdbv-node-error { border-color: rgba(253,54,110,0.5); background: rgba(253,54,110,0.07); }
.rxdbv-node-pulse { animation: rxdbvNodePulse 250ms ease-out; }
.rxdbv-map-rows { flex: 1; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.rxdbv-map-row { display: flex; align-items: center; flex: 1; min-height: 0; }
.rxdbv-lane { flex: 1; min-width: 70px; display: flex; flex-direction: column; gap: 9px; }
.rxdbv-track { position: relative; height: 13px; }
.rxdbv-track-line { position: absolute; top: 6px; left: 0; right: 0; height: 1px; background: rgba(255,255,255,0.10); }
.rxdbv-track-line-thread { background: repeating-linear-gradient(90deg,rgba(25,155,241,0.55) 0 4px,transparent 4px 8px); animation: rxdbvThread 1.2s linear infinite; }
.rxdbv-track-line-error { background: repeating-linear-gradient(90deg,rgba(253,54,110,0.6) 0 4px,transparent 4px 8px); }
.rxdbv-particle { position: absolute; top: -1px; font-family: ${DB_VIEWER_FONT_MONO}; font-size: 12px; font-weight: 700; }
.rxdbv-band { flex: 1; height: 9px; }
.rxdbv-spark { display: flex; align-items: flex-end; gap: 1.5px; height: 26px; margin-top: 7px; }
.rxdbv-spark > div { flex: 1; background: ${C.pink}; min-height: 1px; }
.rxdbv-progress { height: 8px; background: ${C.bg}; margin-top: 9px; }
.rxdbv-progress > div { height: 100%; background: ${C.warning}; }
.rxdbv-map-summary { display: flex; align-items: center; gap: 18px; padding: 7px 12px; border-top: 1px solid rgba(255,255,255,0.10); font-size: 11px; font-family: ${DB_VIEWER_FONT_MONO}; flex: none; flex-wrap: wrap; }
.rxdbv-blink { animation: rxdbvBlink 1.4s ease-in-out infinite; }
.rxdbv-legend { display: flex; gap: 10px; font-size: 10px; font-family: ${DB_VIEWER_FONT_MONO}; color: ${C.fgDim}; flex-wrap: wrap; }
.rxdbv-idle-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05); opacity: 0.62; }
.rxdbv-subpanel { position: absolute; inset: 0; z-index: 40; background: rgba(9,11,18,0.85); display: flex; align-items: center; justify-content: center; padding: 24px; }
.rxdbv-subpanel-inner { width: 780px; max-width: 100%; max-height: 100%; overflow: auto; background: ${C.bgDark}; border: 1px solid rgba(255,255,255,0.14); }

/* ---------- schema ---------- */
.rxdbv-typebar { display: flex; height: 10px; width: 240px; max-width: 100%; background: ${C.neutralBar}; }
.rxdbv-swatch { display: inline-block; width: 8px; height: 8px; }

/* ---------- diff ---------- */
.rxdbv-diff { padding: 10px 12px; font-family: ${DB_VIEWER_FONT_MONO}; font-size: 11px; line-height: 1.7; white-space: pre; }
.rxdbv-diff-del { background: rgba(253,54,110,0.14); color: ${C.danger}; display: block; }
.rxdbv-diff-add { background: rgba(62,207,142,0.12); color: ${C.success}; display: block; }
.rxdbv-detail { width: 460px; min-width: 460px; overflow: auto; background: ${C.bgDrawer}; }

/* ---------- connection ---------- */
.rxdbv-stage { display: flex; gap: 10px; align-items: center; }
.rxdbv-stage-glyph { width: 16px; flex: none; }

/* ---------- narrow ---------- */
.rxdbv-narrow-header {
    height: 48px; min-height: 48px; background: ${C.purpleDeep};
    border-bottom: 1px solid rgba(255,255,255,0.10);
    display: flex; align-items: center; gap: 10px; padding: 0 14px; flex: none;
}
.rxdbv-narrow .rxdbv-narrow-row {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.06);
    min-height: 44px; cursor: pointer;
}
.rxdbv-narrow { font-size: 13px; }
.rxdbv-narrow-head { padding: 12px 14px 4px; font-size: 10px; font-weight: 600; letter-spacing: 0.09em; color: ${C.fgDim}; }
.rxdbv-narrow-field { padding: 8px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.rxdbv-narrow-field > div:first-child { color: ${C.fgDim}; font-size: 10px; }
.rxdbv-back { color: ${C.fgMuted}; font-size: 16px; cursor: pointer; }

@keyframes rxdbvFlowR { from { left: -2px; opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } to { left: 100%; opacity: 0; } }
@keyframes rxdbvFlowL { from { left: 100%; opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } to { left: -2px; opacity: 0; } }
@keyframes rxdbvBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
@keyframes rxdbvBand { from { background-position: 0 0; } to { background-position: 24px 0; } }
@keyframes rxdbvNodePulse { 0% { border-color: rgba(255,255,255,0.45); } 100% { border-color: rgba(255,255,255,0.12); } }
@keyframes rxdbvThread { from { background-position: 0 0; } to { background-position: -16px 0; } }

@media (prefers-reduced-motion: reduce) {
    .rxdbv-particle, .rxdbv-band, .rxdbv-blink, .rxdbv-node-pulse, .rxdbv-track-line-thread { animation: none !important; }
}
`;
