import {
    DBVIEWER_STYLES,
    DBVIEWER_STYLE_ELEMENT_ID
} from './dbviewer-styles.ts';

export type ElChild = HTMLElement | string | null | undefined | false;

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

export function downloadJson(filename: string, data: any) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
