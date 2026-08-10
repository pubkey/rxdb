/**
 * Minimal DOM helpers.
 * The devtool builds its UI with plain DOM nodes so that it stays
 * framework free and works on every surface it is mounted into.
 */

export type ElementAttributes = {
    class?: string;
    text?: string;
    html?: string;
    title?: string;
    style?: Partial<CSSStyleDeclaration> & { [key: string]: string | undefined; };
    onClick?: (event: MouseEvent) => void;
    onInput?: (event: Event) => void;
    onKeyDown?: (event: KeyboardEvent) => void;
    onFocus?: (event: FocusEvent) => void;
    onBlur?: (event: FocusEvent) => void;
    [attribute: string]: any;
};

const HANDLERS: { [key: string]: string; } = {
    onClick: 'click',
    onDblClick: 'dblclick',
    onInput: 'input',
    onChange: 'change',
    onKeyDown: 'keydown',
    onFocus: 'focus',
    onBlur: 'blur',
    onMouseMove: 'mousemove',
    onMouseLeave: 'mouseleave'
};

export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attributes: ElementAttributes = {},
    children: (Node | string | null | undefined | false)[] = []
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
        if (value === undefined || value === null || value === false) {
            return;
        }
        if (key === 'class') {
            node.className = value as string;
        } else if (key === 'text') {
            node.textContent = String(value);
        } else if (key === 'html') {
            node.innerHTML = value as string;
        } else if (key === 'style') {
            Object.entries(value as object).forEach(([property, styleValue]) => {
                if (styleValue !== undefined) {
                    node.style.setProperty(
                        property.replace(/[A-Z]/g, match => '-' + match.toLowerCase()),
                        String(styleValue)
                    );
                }
            });
        } else if (HANDLERS[key]) {
            node.addEventListener(HANDLERS[key], value as EventListener);
        } else if (key === 'value' && (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) {
            node.value = String(value);
        } else if (key === 'checked' || key === 'disabled') {
            (node as any)[key] = Boolean(value);
        } else {
            node.setAttribute(key, String(value));
        }
    });
    children.forEach(child => {
        if (child === null || child === undefined || child === false) {
            return;
        }
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
}

export function clear(node: HTMLElement): HTMLElement {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
    return node;
}

export function spacer(): HTMLElement {
    return el('div', { class: 'rxdt-grow' });
}

export function button(
    label: string,
    onClick: () => void,
    options: { variant?: 'secondary' | 'primary' | 'danger' | 'dangerSolid'; small?: boolean; disabled?: boolean; title?: string; } = {}
): HTMLButtonElement {
    const variantClass = {
        secondary: 'rxdt-btn',
        primary: 'rxdt-btn-primary',
        danger: 'rxdt-btn-danger',
        dangerSolid: 'rxdt-btn-danger-solid'
    }[options.variant ?? 'secondary'];
    return el('button', {
        class: variantClass + (options.small && variantClass === 'rxdt-btn' ? ' rxdt-btn-sm' : ''),
        text: label,
        title: options.title,
        disabled: options.disabled,
        onClick: () => onClick()
    });
}

/**
 * The primary buttons track the pointer so that the gradient
 * is anchored to the cursor while hovering.
 */
function withCursorGradient(node: HTMLElement): HTMLElement {
    node.addEventListener('mousemove', event => {
        const rect = node.getBoundingClientRect();
        const x = Math.round(event.clientX - rect.left);
        const y = Math.round(event.clientY - rect.top);
        node.style.background = 'radial-gradient(circle at ' + x + 'px ' + y + 'px, #B2218B, #ED168F)';
    });
    node.addEventListener('mouseleave', () => {
        node.style.background = '';
    });
    return node;
}

export function primaryButton(
    label: string,
    onClick: () => void,
    options: { disabled?: boolean; title?: string; } = {}
): HTMLButtonElement {
    return withCursorGradient(
        button(label, onClick, { variant: 'primary', ...options })
    ) as HTMLButtonElement;
}

/**
 * Builds one grid row, `columns` is used as grid-template-columns.
 */
export function gridRow(
    columns: string,
    cells: (Node | string | null | undefined | false)[],
    options: { class?: string; onClick?: (event: MouseEvent) => void; } = {}
): HTMLElement {
    return el(
        'div',
        {
            class: options.class ?? 'rxdt-tr',
            style: { gridTemplateColumns: columns },
            onClick: options.onClick
        },
        cells.map(cell => (cell instanceof Node || typeof cell === 'string')
            ? el('div', {}, [cell])
            : el('div')
        )
    );
}

export function gridHead(
    columns: string,
    cells: (Node | string)[]
): HTMLElement {
    return el(
        'div',
        { class: 'rxdt-thead', style: { gridTemplateColumns: columns } },
        cells.map(cell => el('div', {}, [cell]))
    );
}
