import {
    createCopyButton,
    el
} from './dbviewer-dom.ts';
import {
    colorViewerJson,
    sanitizeViewerValue
} from './dbviewer-helpers.ts';

export const VIEWER_DOCS_BASE_URL = 'https://rxdb.info/';

/**
 * Shows an error as a popup over the viewer. When the error
 * is an RxError, its parameters are serialized into a readable
 * JSON view with a copy button.
 */
export function showViewerError(host: HTMLElement, title: string, error: any) {
    const message = String(error && error.message ? error.message : error);
    const shortMessage = message.length > 600 ? message.slice(0, 600) + '…' : message;

    const backdrop = el('div', 'rxdbv-modal-backdrop');
    const close = () => backdrop.remove();
    const modal = el('div', 'rxdbv-modal', [
        el('div', 'rxdbv-modal-title', '✕ ' + title),
        el('div', 'rxdbv-error-modal-message', shortMessage)
    ]);
    if (error && error.parameters && Object.keys(error.parameters).length > 0) {
        const sanitized = sanitizeViewerValue(error.parameters);
        const paramsView = el('div', 'rxdbv-error-modal-params', undefined, {
            html: colorViewerJson(sanitized)
        });
        modal.appendChild(el('div', 'rxdbv-drawer-section', 'PARAMETERS', { style: 'padding:10px 0 2px' }));
        modal.appendChild(el('div', 'rxdbv-json-wrap', [
            paramsView,
            createCopyButton(() => JSON.stringify(sanitized, null, 2))
        ]));
    }
    if (error && error.code) {
        modal.appendChild(el('div', 'rxdbv-dim', [
            'RxDB error code ',
            el('a', 'rxdbv-mono', String(error.code), {
                onClick: () => window.open(VIEWER_DOCS_BASE_URL + 'errors.html?console=errors&code=' + error.code, '_blank')
            })
        ], { style: 'margin-top:10px;font-size:10.5px' }));
    }
    modal.appendChild(el('div', 'rxdbv-modal-actions', [
        el('button', 'rxdbv-btn', 'Close', { onClick: close })
    ]));
    backdrop.appendChild(modal);
    backdrop.addEventListener('click', event => {
        if (event.target === backdrop) {
            close();
        }
    });
    host.appendChild(backdrop);
}
