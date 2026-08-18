import {
    DBVIEWER_STYLES,
    DBVIEWER_STYLE_ELEMENT_ID
} from './dbviewer-styles.ts';

export type ElChild = HTMLElement | string | null | undefined | false;

/**
 * The official RxDB logo, inlined so the viewer stays
 * self-contained without asset files or network requests.
 * Source: docs-src/static/files/logo/logo.svg
 */
export const DBVIEWER_LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 103.33 140" aria-label="RxDB logo"><defs><style>.rxdbv-lg1{fill:#752a8a}.rxdbv-lg4{fill:#ed168f}</style></defs><path d="M98.33 10c-2.76 0-5-2.24-5-5s-2.24-5-5-5H75c-2.76 0-5 2.24-5 5v16.67c0 2.76-2.24 5-5 5H5c-2.76 0-5 2.24-5 5V125c0 2.76 2.24 5 5 5s5 2.24 5 5 2.24 5 5 5h13.33c2.76 0 5-2.24 5-5v-16.67c0-2.76 2.24-5 5-5h60c2.76 0 5-2.24 5-5V15c0-2.76-2.24-5-5-5" style="fill:#fff"/><path d="M6.67 60h90v20h-90z" style="fill:#b2218b" transform="rotate(180 51.665 70)"/><path d="M96.66 53.34h-90v-20h90z" class="rxdbv-lg4"/><path d="M96.66 106.66h-90v-20h90zM26.67 113.33v20h-10v-10h-10v-10z" class="rxdbv-lg1"/><path d="M86.67 6.67v10h10v10h-20v-20z" class="rxdbv-lg4"/></svg>';

/**
 * Small DOM builder so the viewer needs no framework
 * and ships as plain TypeScript.
 */
export function el(
    tag: string,
    className?: string,
    children?: ElChild[] | ElChild,
    attrs?: { [k: string]: any; }
): HTMLElement {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (attrs) {
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'text') {
                node.textContent = String(value);
            } else if (key === 'html') {
                node.innerHTML = String(value);
            } else if (key === 'onClick') {
                node.addEventListener('click', value);
            } else if (key === 'title' || key === 'placeholder' || key === 'type' || key === 'value') {
                (node as any)[key] = value;
            } else if (key === 'style') {
                node.setAttribute('style', String(value));
            } else {
                node.setAttribute(key, String(value));
            }
        });
    }
    if (children) {
        const list = Array.isArray(children) ? children : [children];
        list.forEach(child => {
            if (child === null || typeof child === 'undefined' || child === false) {
                return;
            }
            if (typeof child === 'string') {
                node.appendChild(document.createTextNode(child));
            } else {
                node.appendChild(child);
            }
        });
    }
    return node;
}

export function clearChildren(node: HTMLElement) {
    /**
     * textContent instead of removeChild() in a loop,
     * because blur handlers of removed inputs can trigger
     * re-renders while the loop is running.
     */
    node.textContent = '';
}

export function ensureViewerStyles(doc: Document) {
    if (doc.getElementById(DBVIEWER_STYLE_ELEMENT_ID)) {
        return;
    }
    const styleElement = doc.createElement('style');
    styleElement.id = DBVIEWER_STYLE_ELEMENT_ID;
    styleElement.textContent = DBVIEWER_STYLES;
    doc.head.appendChild(styleElement);
}

/**
 * The same icons the docs use for their code block
 * copy button (docusaurus copyButtonIcon / copyButtonSuccessIcon).
 */
const COPY_ICON_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"></path></svg>';
const COPY_SUCCESS_ICON_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,6.58L21,7Z"></path></svg>';

/**
 * A copy-to-clipboard button for code and JSON views.
 * Shows the success check for a moment after copying.
 */
export function createCopyButton(getText: () => string): HTMLElement {
    const button = el('button', 'rxdbv-copy-btn', undefined, {
        title: 'Copy to clipboard',
        html: COPY_ICON_SVG
    });
    button.addEventListener('click', event => {
        event.stopPropagation();
        const text = getText();
        const showSuccess = () => {
            button.innerHTML = COPY_SUCCESS_ICON_SVG;
            button.classList.add('rxdbv-copied');
            setTimeout(() => {
                button.innerHTML = COPY_ICON_SVG;
                button.classList.remove('rxdbv-copied');
            }, 1200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(showSuccess).catch(() => {});
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
            showSuccess();
        }
    });
    return button;
}

/**
 * Wraps a code or JSON element so a copy button
 * floats in its top right corner.
 */
export function withCopyButton(content: HTMLElement, getText: () => string): HTMLElement {
    const wrap = el('div', 'rxdbv-json-wrap', [content, createCopyButton(getText)]);
    return wrap;
}

export function downloadJson(filename: string, data: any) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
