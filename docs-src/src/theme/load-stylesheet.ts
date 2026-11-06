const loading = new Map<string, Promise<void>>();

/**
 * Appends a <link rel="stylesheet"> for the given URL, once per URL.
 * Resolves when the stylesheet is loaded, or failed to load, so callers
 * can wait before they render the elements that need it.
 */
export function loadStylesheet(href: string): Promise<void> {
    let promise = loading.get(href);
    if (!promise) {
        promise = new Promise<void>(resolve => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => resolve();
            link.onerror = () => resolve();
            document.head.appendChild(link);
        });
        loading.set(href, promise);
    }
    return promise;
}
