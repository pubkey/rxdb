import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

type DocusaurusGlobal = {
    prefetch: (url: string) => false | Promise<void[]>;
    preload: (url: string) => false | Promise<void[]>;
};

/**
 * By default the Docusaurus <Link> prefetches the JavaScript chunks of every
 * internal link as soon as the link scrolls into the viewport. On docs pages
 * with a long sidebar this starts many requests during the initial page load.
 *
 * Here the viewport prefetching is disabled. The chunks of a route are still
 * loaded when the visitor hovers or touches a link, because <Link> calls
 * window.docusaurus.preload() on mouseenter and touchstart.
 *
 * Docusaurus freezes the object before it assigns it to window.docusaurus,
 * so the assignment is intercepted and a copy with a no-op prefetch() is
 * stored instead. Client modules are evaluated before that assignment.
 */
if (ExecutionEnvironment.canUseDOM) {
    let docusaurusGlobal: DocusaurusGlobal | undefined;
    Object.defineProperty(window, 'docusaurus', {
        configurable: true,
        get: () => docusaurusGlobal,
        set: (value: DocusaurusGlobal) => {
            docusaurusGlobal = Object.freeze({
                ...value,
                prefetch: () => false as const
            });
        }
    });
}
