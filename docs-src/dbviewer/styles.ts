/**
 * The full stylesheet of the viewer.
 * All values come from the design tokens of the rxdb.info brand:
 * no border radii except the logo circle and status dots,
 * web-safe font stacks and 1px white borders at 5-25% opacity.
 */
export const DBVIEWER_STYLE_ELEMENT_ID = 'rxdb-dbviewer-styles';

export const DBVIEWER_STYLES = `
.rxdbv-root {
    --rxdbv-pink: #ED168F;
    --rxdbv-pink-deep: #B2218B;
    --rxdbv-purple: #752A8A;
    --rxdbv-purple-header: #27022D;
    --rxdbv-bg-dark: #0D0F18;
    --rxdbv-bg: #20293C;
    --rxdbv-bg-code: #282330;
    --rxdbv-bg-detail: #10141F;
    --rxdbv-active-segment: #2C3547;
    --rxdbv-neutral-bar: #3A4256;
    --rxdbv-fg: #FFFFFF;
    --rxdbv-fg-muted: #B5B5B5;
    --rxdbv-fg-dim: #6E7688;
    --rxdbv-success: #3ECF8E;
    --rxdbv-danger: #FD366E;
    --rxdbv-warning: #EBCB4B;
    --rxdbv-info: #199BF1;
    --rxdbv-violet: #9B6BFF;
    --rxdbv-gradient: linear-gradient(90deg, #ED168F, #B2218B, #752A8A);
    --rxdbv-font: system-ui, 'Segoe UI', Helvetica, Arial, sans-serif;
    --rxdbv-mono: ui-monospace, Menlo, Consolas, monospace;

    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 300px;
    background: var(--rxdbv-bg-dark);
    color: var(--rxdbv-fg);
    font-family: var(--rxdbv-font);
    font-size: 12px;
    letter-spacing: 0.01em;
    overflow: hidden;
    box-sizing: border-box;
    text-align: left;
}
.rxdbv-root *, .rxdbv-root *::before, .rxdbv-root *::after { box-sizing: border-box; }
.rxdbv-root ::-webkit-scrollbar { width: 8px; height: 8px; }
.rxdbv-root ::-webkit-scrollbar-thumb { background: var(--rxdbv-active-segment); border-radius: 4px; }
.rxdbv-root a {
    color: var(--rxdbv-fg);
    text-decoration: underline;
    text-decoration-color: var(--rxdbv-pink);
    text-decoration-thickness: 1.5px;
    text-underline-offset: 3px;
    cursor: pointer;
}
.rxdbv-root a:hover { color: var(--rxdbv-pink); }
.rxdbv-mono { font-family: var(--rxdbv-mono); }
.rxdbv-dim { color: var(--rxdbv-fg-dim); }
.rxdbv-muted { color: var(--rxdbv-fg-muted); }
.rxdbv-flex1 { flex: 1; }

@keyframes rxdbvFlowR { from { left: -2px; opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } to { left: 100%; opacity: 0; } }
@keyframes rxdbvFlowL { from { left: 100%; opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } to { left: -2px; opacity: 0; } }
@keyframes rxdbvBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
@keyframes rxdbvRowIn { from { background: rgba(62, 207, 142, 0.22); } to { background: transparent; } }
@keyframes rxdbvNodePulse { 0% { border-color: rgba(255, 255, 255, 0.45); } 100% { border-color: rgba(255, 255, 255, 0.12); } }
@keyframes rxdbvThread { from { background-position: 0 0; } to { background-position: -16px 0; } }

/* buttons */
.rxdbv-btn {
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: transparent;
    color: var(--rxdbv-fg);
    font-size: 11px;
    padding: 4px 12px;
    border-radius: 0;
    cursor: pointer;
    font-family: inherit;
    transition: background 180ms ease-in-out, color 180ms ease-in-out, transform 80ms ease;
}
.rxdbv-btn:hover { background: var(--rxdbv-fg); color: var(--rxdbv-bg-dark); }
.rxdbv-btn:active { transform: translateY(1px); }
.rxdbv-btn:disabled { opacity: 0.5; cursor: default; }
.rxdbv-btn:disabled:hover { background: transparent; color: var(--rxdbv-fg); }
.rxdbv-btn-small { font-size: 10px; padding: 3px 10px; }
.rxdbv-btn-primary {
    border: 0;
    background: var(--rxdbv-gradient);
    color: var(--rxdbv-fg);
    font-weight: 700;
    font-size: 11px;
    padding: 6px 16px;
    border-radius: 0;
    cursor: pointer;
    font-family: inherit;
    transition: transform 80ms ease;
}
.rxdbv-btn-primary:active { transform: translateY(1px); }
.rxdbv-btn-primary:disabled { opacity: 0.4; cursor: default; }
.rxdbv-btn-danger-outline {
    border: 1px solid var(--rxdbv-danger);
    background: transparent;
    color: var(--rxdbv-danger);
    font-weight: 700;
    font-size: 11px;
    padding: 6px 14px;
    border-radius: 0;
    cursor: pointer;
    font-family: inherit;
    transition: background 180ms ease-in-out, color 180ms ease-in-out;
}
.rxdbv-btn-danger-outline:hover { background: var(--rxdbv-danger); color: var(--rxdbv-fg); }

/* top bar */
.rxdbv-topbar {
    height: 44px;
    min-height: 44px;
    background: var(--rxdbv-purple-header);
    border-bottom: 1px solid rgba(255, 255, 255, 0.10);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 12px;
    font-size: 12px;
}
.rxdbv-logo {
    width: 13px;
    height: 17px;
    display: inline-flex;
    align-items: center;
}
.rxdbv-logo svg { width: 100%; height: 100%; }
.rxdbv-wordmark { font-weight: 800; letter-spacing: 0.02em; }
.rxdbv-topbar-divider { color: rgba(255, 255, 255, 0.25); }
.rxdbv-topbar-identity { font-family: var(--rxdbv-mono); font-size: 11px; color: var(--rxdbv-fg-muted); }
/* copy to clipboard */
.rxdbv-json-wrap { position: relative; flex: 1; display: flex; flex-direction: column; min-height: 0; }
.rxdbv-copy-btn {
    position: absolute;
    top: 8px;
    right: 12px;
    z-index: 5;
    border: 1px solid rgba(255, 255, 255, 0.20);
    background: var(--rxdbv-bg);
    color: var(--rxdbv-fg-muted);
    padding: 4px 6px;
    border-radius: 0;
    cursor: pointer;
    line-height: 0;
    opacity: 0.6;
    transition: opacity 180ms ease-in-out, color 180ms ease-in-out;
}
.rxdbv-json-wrap:hover .rxdbv-copy-btn, .rxdbv-copy-btn:hover { opacity: 1; }
.rxdbv-copy-btn.rxdbv-copied { color: var(--rxdbv-success); opacity: 1; }

/* banners */
.rxdbv-banner-dump {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px;
    background: rgba(235, 203, 75, 0.08);
    border-bottom: 1px solid rgba(235, 203, 75, 0.35);
    font-size: 11px;
}

/* body layout */
.rxdbv-body { flex: 1; display: flex; min-height: 0; }
.rxdbv-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }

/* rail */
.rxdbv-rail {
    width: 200px;
    min-width: 200px;
    background: var(--rxdbv-bg-dark);
    border-right: 1px solid rgba(255, 255, 255, 0.10);
    display: flex;
    flex-direction: column;
    font-size: 11px;
    padding: 10px 0;
    overflow-y: auto;
}
.rxdbv-rail-header {
    padding: 4px 12px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.09em;
    color: var(--rxdbv-fg-dim);
}
.rxdbv-rail-header + .rxdbv-rail-header,
.rxdbv-rail-item + .rxdbv-rail-header { padding-top: 14px; }
.rxdbv-rail-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px 4px 10px;
    border-left: 2px solid transparent;
    color: var(--rxdbv-fg-muted);
    cursor: pointer;
    transition: background 180ms ease-in-out, color 180ms ease-in-out;
}
.rxdbv-rail-item:hover { background: rgba(255, 255, 255, 0.05); }
.rxdbv-rail-item.rxdbv-active {
    border-left-color: var(--rxdbv-pink);
    background: rgba(237, 22, 143, 0.10);
    color: var(--rxdbv-fg);
}
.rxdbv-rail-item .rxdbv-rail-label { flex: 1; font-family: var(--rxdbv-mono); }
.rxdbv-rail-item .rxdbv-rail-count { color: var(--rxdbv-fg-dim); font-family: var(--rxdbv-mono); }
.rxdbv-rail-settings {
    padding: 6px 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--rxdbv-fg-muted);
    cursor: pointer;
}
.rxdbv-rail-settings:hover { color: var(--rxdbv-fg); }
.rxdbv-rail-spacer { flex: 1; }

/* toolbar */
.rxdbv-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-wrap: wrap;
}
.rxdbv-toolbar-title { font-weight: 700; font-size: 13px; }
.rxdbv-segments { display: flex; border: 1px solid rgba(255, 255, 255, 0.20); font-size: 11px; }
.rxdbv-segment { padding: 3px 12px; color: var(--rxdbv-fg-muted); cursor: pointer; transition: color 180ms ease-in-out; }
.rxdbv-segment + .rxdbv-segment { border-left: 1px solid rgba(255, 255, 255, 0.20); }
.rxdbv-segment:hover { color: var(--rxdbv-fg); }
.rxdbv-segment.rxdbv-active { background: var(--rxdbv-active-segment); color: var(--rxdbv-fg); }
.rxdbv-observe {
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid rgba(255, 255, 255, 0.20);
    padding: 3px 10px;
    font-size: 11px;
    color: var(--rxdbv-fg-muted);
    cursor: pointer;
    transition: color 180ms ease-in-out, border-color 180ms ease-in-out;
}
.rxdbv-observe:hover { color: var(--rxdbv-fg); }
.rxdbv-observe .rxdbv-observe-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rxdbv-fg-dim); }
.rxdbv-observe.rxdbv-active { border-color: rgba(62, 207, 142, 0.5); color: var(--rxdbv-success); }
.rxdbv-observe.rxdbv-active .rxdbv-observe-dot { background: var(--rxdbv-success); }
.rxdbv-observe.rxdbv-disabled { opacity: 0.5; cursor: default; }

/* query bar */
.rxdbv-querybar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    position: relative;
}
.rxdbv-query-input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--rxdbv-bg);
    border: 1px solid rgba(255, 255, 255, 0.14);
    padding: 5px 10px;
    font-family: var(--rxdbv-mono);
    font-size: 11.5px;
}
.rxdbv-query-input-wrap.rxdbv-error { border-color: var(--rxdbv-danger); }
.rxdbv-query-input-wrap.rxdbv-focus { border-color: var(--rxdbv-pink); }
.rxdbv-query-input {
    flex: 1;
    background: transparent;
    border: 0;
    outline: none;
    color: var(--rxdbv-fg);
    font-family: var(--rxdbv-mono);
    font-size: 11.5px;
    padding: 0;
}
.rxdbv-query-history-toggle { color: var(--rxdbv-fg-dim); font-size: 10px; cursor: pointer; white-space: nowrap; }
.rxdbv-query-history-toggle:hover { color: var(--rxdbv-fg); }
.rxdbv-query-dropdown {
    position: absolute;
    top: 100%;
    left: 12px;
    right: 12px;
    margin-top: -4px;
    background: var(--rxdbv-bg-code);
    border: 1px solid rgba(255, 255, 255, 0.14);
    font-size: 11px;
    z-index: 40;
    max-height: 320px;
    overflow-y: auto;
}
.rxdbv-query-dropdown-header {
    padding: 6px 10px 2px;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.09em;
    color: var(--rxdbv-fg-dim);
}
.rxdbv-query-dropdown-header + .rxdbv-query-dropdown-header { border-top: 1px solid rgba(255, 255, 255, 0.08); }
.rxdbv-query-dropdown-row { display: flex; gap: 10px; padding: 4px 10px; cursor: pointer; align-items: baseline; }
.rxdbv-query-dropdown-row:hover, .rxdbv-query-dropdown-row.rxdbv-active { background: rgba(255, 255, 255, 0.05); }
.rxdbv-query-dropdown-row .rxdbv-fav-star { color: var(--rxdbv-pink); }
.rxdbv-query-dropdown-row .rxdbv-recent-glyph { color: var(--rxdbv-fg-dim); }
.rxdbv-query-dropdown-row .rxdbv-fav-name { width: 110px; color: var(--rxdbv-fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rxdbv-query-dropdown-row .rxdbv-query-text { font-family: var(--rxdbv-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.rxdbv-query-dropdown-footer { padding: 5px 10px; border-top: 1px solid rgba(255, 255, 255, 0.08); color: var(--rxdbv-fg-dim); font-size: 10px; }
.rxdbv-query-error-block { padding: 10px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.rxdbv-query-error-message { font-family: var(--rxdbv-mono); font-size: 11px; color: var(--rxdbv-danger); }
.rxdbv-query-error-caret { font-family: var(--rxdbv-mono); font-size: 11px; color: var(--rxdbv-fg-dim); white-space: pre; margin-top: 4px; }
.rxdbv-query-error-caret .rxdbv-caret { color: var(--rxdbv-danger); }
.rxdbv-query-error-hint { color: var(--rxdbv-fg-muted); font-size: 11px; margin-top: 10px; line-height: 1.55; }
.rxdbv-query-error-hint code { font-family: var(--rxdbv-mono); color: var(--rxdbv-fg); }

/* grid */
.rxdbv-grid-scroll { flex: 1; overflow: auto; }
.rxdbv-grid-header {
    display: grid;
    padding: 0 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--rxdbv-fg-dim);
    position: sticky;
    top: 0;
    background: var(--rxdbv-bg-dark);
    z-index: 2;
}
.rxdbv-grid-header > div { padding: 5px 8px 5px 0; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rxdbv-grid-header > div.rxdbv-sorted { color: var(--rxdbv-fg); }
.rxdbv-grid-row {
    display: grid;
    padding: 0 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 11px;
    cursor: pointer;
    transition: background 180ms ease-in-out;
}
.rxdbv-grid-row:hover { background: rgba(255, 255, 255, 0.04); }
.rxdbv-grid-row.rxdbv-selected { background: rgba(237, 22, 143, 0.10); }
.rxdbv-grid-row.rxdbv-fresh { animation: rxdbvRowIn 2s ease-out; }
.rxdbv-grid-row > div { padding: 4px 8px 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rxdbv-grid-checkbox-cell { padding: 4px 0 !important; }
.rxdbv-root input[type='checkbox'] { accent-color: var(--rxdbv-pink); width: 12px; height: 12px; margin: 0; }
.rxdbv-cell-edit-input {
    background: var(--rxdbv-bg);
    border: 1px solid var(--rxdbv-pink);
    color: var(--rxdbv-fg);
    font-size: 11px;
    font-family: inherit;
    padding: 1px 6px;
    width: 90%;
    outline: none;
}
.rxdbv-grid-footer {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 11px;
    color: var(--rxdbv-fg-muted);
    flex-wrap: wrap;
}
.rxdbv-pager {
    border: 1px solid rgba(255, 255, 255, 0.20);
    background: transparent;
    color: var(--rxdbv-fg);
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 0;
    cursor: pointer;
    font-family: inherit;
}
.rxdbv-pager:disabled { color: var(--rxdbv-fg-dim); cursor: default; }
.rxdbv-pager:not(:disabled):hover { background: var(--rxdbv-fg); color: var(--rxdbv-bg-dark); }

/* JSON view */
.rxdbv-json-view {
    flex: 1;
    overflow: auto;
    padding: 10px 14px;
    font-family: var(--rxdbv-mono);
    font-size: 11px;
    line-height: 1.65;
    white-space: pre;
}
.rxdbv-json-key { color: var(--rxdbv-fg-dim); }
.rxdbv-json-str { color: var(--rxdbv-success); }
.rxdbv-json-num { color: var(--rxdbv-warning); }
.rxdbv-json-doc-fresh { background: rgba(62, 207, 142, 0.08); display: block; }
.rxdbv-json-fresh-note { color: var(--rxdbv-success); }

/* drawer */
.rxdbv-drawer {
    width: 340px;
    min-width: 340px;
    border-left: 1px solid rgba(255, 255, 255, 0.14);
    background: var(--rxdbv-bg-detail);
    display: flex;
    flex-direction: column;
    overflow: auto;
    font-size: 11px;
}
.rxdbv-drawer-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.rxdbv-badge-edited { font-size: 9px; border: 1px solid rgba(237, 22, 143, 0.5); color: var(--rxdbv-pink); padding: 1px 6px; }
.rxdbv-close { color: var(--rxdbv-fg-dim); cursor: pointer; font-size: 14px; }
.rxdbv-close:hover { color: var(--rxdbv-fg); }
.rxdbv-drawer-section {
    padding: 8px 12px 2px;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.09em;
    color: var(--rxdbv-fg-dim);
}
.rxdbv-drawer-section.rxdbv-bordered { border-top: 1px solid rgba(255, 255, 255, 0.08); margin-top: 8px; padding-top: 10px; }
.rxdbv-drawer-section.rxdbv-willrun { color: var(--rxdbv-pink); }
.rxdbv-field-row { display: flex; gap: 8px; padding: 3px 12px; align-items: center; }
.rxdbv-field-row .rxdbv-field-label { width: 80px; min-width: 80px; color: var(--rxdbv-fg-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rxdbv-field-row .rxdbv-field-value { font-family: var(--rxdbv-mono); color: var(--rxdbv-fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rxdbv-field-row .rxdbv-field-value.rxdbv-string { color: var(--rxdbv-success); }
.rxdbv-field-row .rxdbv-expand-toggle { cursor: pointer; }
.rxdbv-field-child { display: flex; gap: 8px; padding: 2px 12px 2px 28px; font-family: var(--rxdbv-mono); }
.rxdbv-field-child .rxdbv-field-label { width: 64px; min-width: 64px; color: var(--rxdbv-fg-dim); }
.rxdbv-field-input {
    flex: 1;
    background: var(--rxdbv-bg);
    border: 1px solid var(--rxdbv-pink);
    color: var(--rxdbv-fg);
    font-size: 11px;
    font-family: var(--rxdbv-mono);
    padding: 2px 6px;
    outline: none;
    min-width: 0;
}
.rxdbv-field-input.rxdbv-clean { border-color: rgba(255, 255, 255, 0.14); }
.rxdbv-modified-dot { width: 6px; height: 6px; min-width: 6px; border-radius: 50%; background: var(--rxdbv-pink); }
.rxdbv-badge-primary { font-size: 9px; color: var(--rxdbv-fg-dim); border: 1px solid rgba(255, 255, 255, 0.15); padding: 0 4px; }
.rxdbv-attachment-box { margin: 4px 12px; border: 1px solid rgba(255, 255, 255, 0.12); }
.rxdbv-attachment-row { display: flex; gap: 8px; padding: 4px 8px; align-items: center; }
.rxdbv-attachment-preview {
    max-height: 140px;
    overflow: hidden;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--rxdbv-bg-detail);
}
.rxdbv-attachment-preview img { max-width: 100%; max-height: 140px; }
.rxdbv-willrun-code {
    margin: 4px 12px;
    background: var(--rxdbv-bg-code);
    padding: 8px 10px;
    font-family: var(--rxdbv-mono);
    font-size: 10.5px;
    line-height: 1.6;
    white-space: pre;
    overflow: auto;
}
.rxdbv-willrun-code .rxdbv-changed-line { background: rgba(237, 22, 143, 0.18); display: block; }
.rxdbv-willrun-code .rxdbv-comment { color: var(--rxdbv-fg-dim); }
.rxdbv-drawer-actions { display: flex; gap: 8px; padding: 8px 12px 14px; }

/* modal */
.rxdbv-modal-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(9, 11, 18, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 60;
}
.rxdbv-modal {
    width: 440px;
    max-width: 92%;
    background: var(--rxdbv-bg);
    border: 1px solid rgba(255, 255, 255, 0.20);
    border-top: 2px solid var(--rxdbv-danger);
    padding: 18px 20px;
    font-size: 12px;
}
.rxdbv-modal-title { font-weight: 700; font-size: 14px; }
.rxdbv-modal-body { color: var(--rxdbv-fg-muted); margin-top: 8px; line-height: 1.55; font-size: 11.5px; }
.rxdbv-modal-body code { font-family: var(--rxdbv-mono); color: var(--rxdbv-fg); }
.rxdbv-modal-confirm-label { color: var(--rxdbv-fg-dim); margin-top: 12px; font-size: 11px; }
.rxdbv-modal-input {
    width: 100%;
    margin-top: 4px;
    background: var(--rxdbv-bg-dark);
    border: 1px solid rgba(255, 255, 255, 0.20);
    color: var(--rxdbv-fg);
    font-family: var(--rxdbv-mono);
    font-size: 12px;
    padding: 6px 8px;
    outline: none;
}
.rxdbv-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.rxdbv-btn-danger-solid {
    border: 0;
    background: var(--rxdbv-danger);
    color: var(--rxdbv-fg);
    font-weight: 700;
    font-size: 11px;
    padding: 6px 14px;
    border-radius: 0;
    cursor: pointer;
    font-family: inherit;
}
.rxdbv-btn-danger-solid:disabled { opacity: 0.5; cursor: default; }

/* panels shared */
.rxdbv-panel-scroll { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: auto; }
.rxdbv-stat-cards { display: flex; gap: 12px; padding: 14px 12px; flex-wrap: wrap; }
.rxdbv-stat-card { flex: 1; min-width: 150px; background: var(--rxdbv-bg); border: 1px solid rgba(255, 255, 255, 0.10); padding: 10px 12px; }
.rxdbv-stat-card .rxdbv-stat-label { font-size: 9px; letter-spacing: 0.09em; color: var(--rxdbv-fg-dim); font-weight: 600; }
.rxdbv-stat-card .rxdbv-stat-value { font-family: var(--rxdbv-mono); font-size: 13px; margin-top: 4px; }
.rxdbv-section-label { padding: 12px 12px 0; font-size: 9px; font-weight: 600; letter-spacing: 0.09em; color: var(--rxdbv-fg-dim); }
.rxdbv-table-header {
    display: grid;
    padding: 0 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--rxdbv-fg-dim);
}
.rxdbv-table-header > div { padding: 5px 8px 5px 0; }
.rxdbv-table-row { display: grid; padding: 0 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 11px; align-items: center; }
.rxdbv-table-row > div { padding: 6px 8px 6px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rxdbv-table-row.rxdbv-clickable { cursor: pointer; }
.rxdbv-table-row.rxdbv-clickable:hover { background: rgba(255, 255, 255, 0.04); }
.rxdbv-table-row.rxdbv-selected { background: rgba(237, 22, 143, 0.10); }
.rxdbv-type-bar { display: flex; height: 10px; width: 240px; max-width: 100%; background: var(--rxdbv-neutral-bar); }
.rxdbv-finding { margin: 6px 12px; padding: 10px 12px; font-size: 11.5px; }
.rxdbv-finding.rxdbv-warning-box { border: 1px solid rgba(235, 203, 75, 0.4); background: rgba(235, 203, 75, 0.06); }
.rxdbv-finding.rxdbv-danger-box { border: 1px solid rgba(253, 54, 110, 0.4); background: rgba(253, 54, 110, 0.06); }
.rxdbv-finding .rxdbv-finding-title { font-weight: 700; }
.rxdbv-finding.rxdbv-warning-box .rxdbv-finding-title { color: var(--rxdbv-warning); }
.rxdbv-finding.rxdbv-danger-box .rxdbv-finding-title { color: var(--rxdbv-danger); }
.rxdbv-finding .rxdbv-finding-body { color: var(--rxdbv-fg-muted); margin-top: 4px; line-height: 1.55; }
.rxdbv-finding .rxdbv-finding-body code { font-family: var(--rxdbv-mono); color: var(--rxdbv-fg); }
.rxdbv-plan-box { margin: 6px 12px; border: 1px solid rgba(255, 255, 255, 0.10); font-size: 11px; font-family: var(--rxdbv-mono); }
.rxdbv-plan-step { display: flex; gap: 12px; padding: 6px 10px; }
.rxdbv-plan-step + .rxdbv-plan-step { border-top: 1px solid rgba(255, 255, 255, 0.06); }
.rxdbv-plan-step .rxdbv-plan-num { color: var(--rxdbv-fg-dim); width: 14px; }
.rxdbv-plan-step .rxdbv-plan-desc { flex: 1; }
.rxdbv-cleanup-card { margin: 16px 12px; border: 1px solid rgba(255, 255, 255, 0.12); padding: 12px; max-width: 640px; }

/* changes panel */
.rxdbv-split { flex: 1; display: flex; min-height: 0; }
.rxdbv-split-left { flex: 1; overflow: auto; border-right: 1px solid rgba(255, 255, 255, 0.10); }
.rxdbv-split-right { width: 460px; min-width: 460px; overflow: auto; background: var(--rxdbv-bg-detail); }
.rxdbv-filter-input {
    background: var(--rxdbv-bg);
    border: 1px solid rgba(255, 255, 255, 0.14);
    padding: 3px 10px;
    font-size: 11px;
    color: var(--rxdbv-fg);
    font-family: var(--rxdbv-mono);
    outline: none;
    width: 190px;
}
.rxdbv-filter-input::placeholder { color: var(--rxdbv-fg-dim); }
.rxdbv-diff-block { padding: 10px 12px; font-family: var(--rxdbv-mono); font-size: 11px; line-height: 1.7; white-space: pre; overflow: auto; }
.rxdbv-diff-line-removed { background: rgba(253, 54, 110, 0.14); color: var(--rxdbv-danger); display: block; }
.rxdbv-diff-line-added { background: rgba(62, 207, 142, 0.12); color: var(--rxdbv-success); display: block; }
.rxdbv-diff-line-same { display: block; }
.rxdbv-willrun-code .rxdbv-plain-line { display: block; }

/* live map */
.rxdbv-live-map { flex: 1; display: flex; min-height: 0; padding: 14px 12px; gap: 0; overflow: auto; }
.rxdbv-live-col-app { width: 186px; min-width: 186px; display: flex; flex-direction: column; gap: 8px; }
.rxdbv-live-col-header { font-size: 9px; letter-spacing: 0.09em; color: var(--rxdbv-fg-dim); font-weight: 600; }
.rxdbv-live-node { border: 1px solid rgba(255, 255, 255, 0.20); background: var(--rxdbv-bg); padding: 9px 10px; }
.rxdbv-live-rows { flex: 1; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.rxdbv-live-row { display: flex; align-items: center; min-height: 84px; }
.rxdbv-live-lane { flex: 1; min-width: 70px; display: flex; flex-direction: column; gap: 9px; }
.rxdbv-live-lane.rxdbv-in { padding-right: 6px; }
.rxdbv-live-lane.rxdbv-out { padding-left: 6px; }
.rxdbv-live-track { position: relative; height: 13px; }
.rxdbv-live-track .rxdbv-track-line { position: absolute; top: 6px; left: 0; right: 0; height: 1px; background: rgba(255, 255, 255, 0.10); }
.rxdbv-live-track .rxdbv-track-line.rxdbv-thread {
    background: repeating-linear-gradient(90deg, rgba(25, 155, 241, 0.7) 0 6px, transparent 6px 12px);
    height: 1px;
    animation: rxdbvThread 1.4s linear infinite;
}
.rxdbv-live-particle {
    position: absolute;
    top: -1px;
    font-family: var(--rxdbv-mono);
    font-size: 12px;
    font-weight: 700;
}
.rxdbv-live-lane-label { font-size: 10px; color: var(--rxdbv-fg-muted); font-family: var(--rxdbv-mono); }
.rxdbv-live-coll-node { width: 296px; min-width: 296px; border: 1px solid rgba(255, 255, 255, 0.12); background: var(--rxdbv-bg-detail); padding: 9px 10px; }
.rxdbv-live-coll-node.rxdbv-pulse { animation: rxdbvNodePulse 0.25s ease-out; }
.rxdbv-sparkline { display: flex; align-items: flex-end; gap: 1.5px; height: 26px; margin-top: 7px; }
.rxdbv-sparkline > div { flex: 1; background: #2F6B8F; min-height: 1px; }
.rxdbv-live-remote-node { width: 186px; min-width: 186px; border: 1px solid rgba(255, 255, 255, 0.14); background: var(--rxdbv-bg); padding: 9px 10px; }
.rxdbv-live-remote-node.rxdbv-none { border-color: rgba(255, 255, 255, 0.08); background: transparent; }
.rxdbv-live-remote-node.rxdbv-error { border-color: rgba(253, 54, 110, 0.5); background: rgba(253, 54, 110, 0.07); }
.rxdbv-live-summary {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 7px 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.10);
    font-size: 11px;
    font-family: var(--rxdbv-mono);
    flex-wrap: wrap;
}
/**
 * Idle rows fade their graphics but never their text,
 * faded labels on the dark background are unreadable.
 */
.rxdbv-live-idle .rxdbv-live-track { opacity: 0.45; }
.rxdbv-live-idle .rxdbv-live-coll-node,
.rxdbv-live-idle .rxdbv-live-remote-node { opacity: 0.8; }
.rxdbv-live-subpanel { position: absolute; inset: 0; background: rgba(9, 11, 18, 0.85); display: flex; align-items: center; justify-content: center; z-index: 50; }
.rxdbv-live-subpanel-box { width: 780px; max-width: 94%; max-height: 88%; overflow: auto; background: var(--rxdbv-bg-dark); border: 1px solid rgba(255, 255, 255, 0.14); font-size: 12px; }
.rxdbv-live-compact-bar { height: 6px; background: var(--rxdbv-bg); margin-top: 6px; }
.rxdbv-live-compact-bar > div { height: 100%; }

/* empty states */
.rxdbv-empty-state { flex: 1; display: flex; align-items: center; justify-content: center; }
.rxdbv-empty-inner { width: 400px; max-width: 90%; text-align: center; }
.rxdbv-empty-title { font-weight: 800; font-size: 14px; }
.rxdbv-empty-body { color: var(--rxdbv-fg-muted); font-size: 11.5px; margin-top: 6px; line-height: 1.55; }
.rxdbv-empty-body code { font-family: var(--rxdbv-mono); color: var(--rxdbv-fg); background: var(--rxdbv-bg-code); padding: 1px 5px; }
.rxdbv-empty-code {
    margin-top: 10px;
    background: var(--rxdbv-bg-code);
    padding: 8px 12px;
    font-family: var(--rxdbv-mono);
    font-size: 11px;
    text-align: left;
    white-space: pre;
    overflow: auto;
}
.rxdbv-empty-actions { display: flex; gap: 8px; justify-content: center; margin-top: 14px; }

/* error popup */
.rxdbv-error-modal-message {
    font-family: var(--rxdbv-mono);
    font-size: 11.5px;
    color: var(--rxdbv-danger);
    margin-top: 10px;
    line-height: 1.55;
    word-break: break-word;
    max-height: 140px;
    overflow: auto;
}
.rxdbv-error-modal-params {
    margin-top: 10px;
    background: var(--rxdbv-bg-code);
    border: 1px solid rgba(255, 255, 255, 0.10);
    font-family: var(--rxdbv-mono);
    font-size: 10.5px;
    line-height: 1.6;
    white-space: pre;
    overflow: auto;
    max-height: 260px;
    padding: 8px 10px;
}

/* phone layout */
.rxdbv-phone-header {
    height: 48px;
    min-height: 48px;
    background: var(--rxdbv-purple-header);
    border-bottom: 1px solid rgba(255, 255, 255, 0.10);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    font-size: 13px;
}
.rxdbv-phone-back { color: var(--rxdbv-fg-muted); font-size: 16px; cursor: pointer; }
.rxdbv-phone-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    min-height: 44px;
    cursor: pointer;
    font-size: 13px;
}
.rxdbv-phone-row:hover { background: rgba(255, 255, 255, 0.04); }
.rxdbv-phone-note { padding: 12px 14px; border-top: 1px solid rgba(255, 255, 255, 0.08); color: var(--rxdbv-fg-dim); font-size: 11px; }
.rxdbv-phone-field { padding: 8px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 13px; }
.rxdbv-phone-field .rxdbv-phone-field-label { color: var(--rxdbv-fg-dim); font-size: 10px; }
`;
