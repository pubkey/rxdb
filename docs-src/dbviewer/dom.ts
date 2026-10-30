import {
    DBVIEWER_STYLES,
    DBVIEWER_STYLE_ELEMENT_ID
} from './styles.ts';

export type ElChild = HTMLElement | string | null | undefined | false;

/**
 * The official RxDB logo, inlined so the viewer stays
 * self-contained without asset files or network requests.
 * Source: docs-src/static/files/logo/logo.svg
 */
export const DBVIEWER_LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 103.33 140" aria-label="RxDB logo"><defs><style>.rxdbv-lg1{fill:#752a8a}.rxdbv-lg4{fill:#ed168f}</style></defs><path d="M98.33 10c-2.76 0-5-2.24-5-5s-2.24-5-5-5H75c-2.76 0-5 2.24-5 5v16.67c0 2.76-2.24 5-5 5H5c-2.76 0-5 2.24-5 5V125c0 2.76 2.24 5 5 5s5 2.24 5 5 2.24 5 5 5h13.33c2.76 0 5-2.24 5-5v-16.67c0-2.76 2.24-5 5-5h60c2.76 0 5-2.24 5-5V15c0-2.76-2.24-5-5-5" style="fill:#fff"/><path d="M6.67 60h90v20h-90z" style="fill:#b2218b" transform="rotate(180 51.665 70)"/><path d="M96.66 53.34h-90v-20h90z" class="rxdbv-lg4"/><path d="M96.66 106.66h-90v-20h90zM26.67 113.33v20h-10v-10h-10v-10z" class="rxdbv-lg1"/><path d="M86.67 6.67v10h10v10h-20v-20z" class="rxdbv-lg4"/></svg>';

/**
 * Small DOM builder for the imperative screen renderers.
 * The data screens keep the direct DOM code of the original
 * in-page viewer, only the app shell around them is React.
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

/**
 * Icons from the docs icon set (docs-src/src/components/icons),
 * inlined with fill="currentColor" so they follow the text
 * color of the control they sit in.
 */
export const DBVIEWER_ICON_CLOSE = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 16H8L8 12H4L4 16Z" fill="currentColor"/><path d="M0 20H4L4 16H0L0 20Z" fill="currentColor"/><path d="M8 11.9999H12V7.99992H8L8 11.9999Z" fill="currentColor"/><path d="M4 8.00008H8L8 4.00008H4L4 8.00008Z" fill="currentColor"/><path d="M0 4.00004L4 4.00004L4 3.8147e-05L0 3.8147e-05L0 4.00004Z" fill="currentColor"/><path d="M16 11.9999H12V15.9999H16V11.9999Z" fill="currentColor"/><path d="M20 16H16V20H20V16Z" fill="currentColor"/><path d="M16 4.00004H12V8.00004H16V4.00004Z" fill="currentColor"/><path d="M20 0H16V4H20V0Z" fill="currentColor"/></svg>';
export const DBVIEWER_ICON_ARROW_LEFT = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="13" viewBox="0 0 18 30" fill="none" aria-hidden="true"><path d="M12 24H6L6 18H12V24Z" fill="currentColor"/><path d="M18 30H12V24H18V30Z" fill="currentColor"/><path d="M6 18H0L0 12H6L6 18Z" fill="currentColor"/><path d="M12 12H6L6 6L12 6V12Z" fill="currentColor"/><path d="M18 6L12 6V0L18 0V6Z" fill="currentColor"/></svg>';
export const DBVIEWER_ICON_ARROW_RIGHT = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="13" viewBox="0 0 18 30" fill="none" aria-hidden="true"><path d="M6 24H12V18H6L6 24Z" fill="currentColor"/><path d="M0 30H6L6 24H0L0 30Z" fill="currentColor"/><path d="M12 18H18V12H12V18Z" fill="currentColor"/><path d="M6 12H12V6L6 6L6 12Z" fill="currentColor"/><path d="M0 6L6 6L6 0L0 0L0 6Z" fill="currentColor"/></svg>';

export type ToggleOption<T extends string> = {
    value: T;
    label: string;
    title?: string;
};

/**
 * Tabs, used wherever the UI switches between views, for
 * example Table/JSON. Same design as the Tabs component of
 * the docs (docs-src/src/components/tabs.tsx) and the same
 * 31px height as the buttons.
 */
export function buildTabs<T extends string>(
    options: ToggleOption<T>[],
    activeValue: T,
    onChange: (value: T) => void
): HTMLElement {
    return el('div', 'rxdbv-tabs', options.map(option =>
        el('button', 'rxdbv-tab' + (option.value === activeValue ? ' rxdbv-active' : ''), option.label, {
            title: option.title || '',
            onClick: () => {
                if (option.value !== activeValue) {
                    onChange(option.value);
                }
            }
        })
    ));
}

export type InfoBoxKind = 'info' | 'warning' | 'danger';

/**
 * The standard info box, same design as the admonitions of the
 * docs pages (.alert in docs-src/src/css/custom.css): square
 * corners, dark background and a colored border with the
 * thicker left edge of the docs alerts.
 */
export function buildInfoBox(
    kind: InfoBoxKind,
    title: ElChild,
    body: ElChild[] | ElChild
): HTMLElement {
    const children: ElChild[] = [];
    if (title) {
        children.push(el('div', 'rxdbv-admonition-title', title));
    }
    children.push(el('div', 'rxdbv-admonition-body', body));
    return el('div', 'rxdbv-admonition rxdbv-admonition-' + kind, children);
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
export const COPY_ICON_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"></path></svg>';
export const COPY_SUCCESS_ICON_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,6.58L21,7Z"></path></svg>';

export function copyTextToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    return Promise.resolve();
}

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
        copyTextToClipboard(text).then(showSuccess).catch(() => { });
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

export function base64ToBlob(base64: string, type: string): Blob {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: type || 'application/octet-stream' });
}
