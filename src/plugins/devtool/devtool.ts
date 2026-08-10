import type { Subscription } from 'rxjs';
import type { RxDatabase } from '../../types/index.d.ts';
import { clear, el } from './dom.ts';
import { DEVTOOL_CSS, DEVTOOL_NARROW_BREAKPOINT } from './theme.ts';
import { DevtoolStore } from './store.ts';
import { renderConnectionBanner, renderTopBar } from './parts/top-bar.ts';
import { renderRail } from './parts/rail.ts';
import { CollectionPanel } from './parts/collection-panel.ts';
import { LivePanel } from './parts/live-panel.ts';
import { SchemaPanel } from './parts/schema-panel.ts';
import { QueryLabPanel } from './parts/query-lab-panel.ts';
import { ReplicationPanel } from './parts/replication-panel.ts';
import { ChangesPanel } from './parts/changes-panel.ts';
import { StoragePanel } from './parts/storage-panel.ts';
import { NarrowPanel } from './parts/narrow-panel.ts';
import { renderConnectingScreen, renderFailedScreen } from './parts/connection-screens.ts';
import type { PanelContext } from './parts/context.ts';
import type {
    DevtoolHandle,
    DevtoolNavigation,
    DevtoolOptions
} from '../../types/index.d.ts';

const STYLE_ELEMENT_ID = 'rxdb-devtool-style';
const DEFAULT_PAGE_SIZE = 100;
/**
 * The panels re-render at most this often while events stream in,
 * which keeps the animation of the Live map below 3 Hz.
 */
const RENDER_THROTTLE_MS = 400;

type Panel = {
    element: HTMLElement;
    render(): HTMLElement;
    destroy(): void;
};

/**
 * The devtool shell: chrome, navigation and the panel that is currently open.
 */
export class RxDBDevtool implements DevtoolHandle {
    public readonly element: HTMLElement;
    public readonly database: RxDatabase;

    private readonly store: DevtoolStore;
    private readonly context: PanelContext;
    private readonly ownsElement: boolean;
    private readonly onOpenDumpFile: (() => void) | undefined;

    private readonly bodyElement = el('div', { class: 'rxdt-body' });
    private readonly overlayHost = el('div');
    private overlay: HTMLElement | null = null;

    private collectionPanels = new Map<string, CollectionPanel>();
    private toolPanels = new Map<string, Panel>();
    private narrowPanel: NarrowPanel | null = null;

    private subscription: Subscription | null = null;
    private renderScheduled = false;
    private lastRenderAt = 0;
    private destroyed = false;
    private resizeObserver: ResizeObserver | null = null;

    constructor(database: RxDatabase, options: DevtoolOptions = {}) {
        this.database = database;
        this.ownsElement = !options.target;
        this.onOpenDumpFile = options.onOpenDumpFile;

        const firstCollection = Object.keys(database.collections).sort()[0];
        this.store = new DevtoolStore(database, {
            surface: options.surface ?? (options.dump ? 'dump' : 'tab'),
            dump: options.dump ?? null,
            pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
            connection: options.connection ?? { state: 'local' },
            navigation: firstCollection
                ? { kind: 'collection', name: firstCollection }
                : { kind: 'tool', tool: 'live' }
        });

        this.element = options.target ?? createFullScreenElement();
        this.element.classList.add('rxdt');
        injectStyle(this.element);

        this.context = {
            store: this.store,
            render: () => this.scheduleRender(),
            navigate: navigation => this.navigate(navigation),
            setOverlay: node => this.setOverlay(node),
            notify: message => this.notify(message)
        };

        this.store.start();
        this.subscription = this.store.changed$.subscribe(() => this.scheduleRender());
        this.observeResize();
        this.render();
    }

    public navigate(navigation: DevtoolNavigation): void {
        this.store.navigation = navigation;
        this.setOverlay(null);
        this.render();
    }

    public setConnection(connection: DevtoolOptions['connection']): void {
        if (connection) {
            this.store.connection = connection;
            this.render();
        }
    }

    public refresh(): void {
        this.collectionPanels.forEach(panel => panel.load());
        this.render();
    }

    private setOverlay(node: HTMLElement | null): void {
        this.overlay = node;
        clear(this.overlayHost);
        if (node) {
            this.overlayHost.appendChild(node);
        }
    }

    private notify(message: string): void {
        this.setOverlay(el('div', { class: 'rxdt-modal-backdrop' }, [
            el('div', {
                class: 'rxdt-modal',
                style: { borderTopColor: '#EBCB4B' }
            }, [
                el('div', { class: 'rxdt-modal-title', text: 'The action did not run' }),
                el('div', { class: 'rxdt-modal-body', text: message }),
                el('div', { class: 'rxdt-modal-actions' }, [
                    el('button', {
                        class: 'rxdt-btn',
                        text: 'Close',
                        onClick: () => this.setOverlay(null)
                    })
                ])
            ])
        ]));
    }

    private scheduleRender(): void {
        if (this.destroyed || this.renderScheduled) {
            return;
        }
        const sinceLastRender = Date.now() - this.lastRenderAt;
        if (sinceLastRender >= RENDER_THROTTLE_MS) {
            this.render();
            return;
        }
        this.renderScheduled = true;
        setTimeout(() => {
            this.renderScheduled = false;
            this.render();
        }, RENDER_THROTTLE_MS - sinceLastRender);
    }

    private get narrow(): boolean {
        const width = this.element.clientWidth;
        return width > 0 && width < DEVTOOL_NARROW_BREAKPOINT;
    }

    private render(): void {
        if (this.destroyed) {
            return;
        }
        this.lastRenderAt = Date.now();
        clear(this.element);

        if (this.narrow) {
            this.element.appendChild(this.getNarrowPanel().render());
            this.element.appendChild(this.overlayHost);
            return;
        }

        this.element.appendChild(renderTopBar(this.store, {
            onRefresh: () => this.refresh(),
            onCommandPalette: () => this.openCommandPalette(),
            onHelp: () => this.openHelp()
        }));
        const banner = renderConnectionBanner(this.store, () => {
            this.store.connection = { state: 'local' };
            this.render();
        });
        if (banner) {
            this.element.appendChild(banner);
        }

        const connection = this.store.connection;
        if (connection.state === 'connecting') {
            this.element.appendChild(renderConnectingScreen(connection, () => {
                this.store.connection = { state: 'local' };
                this.render();
            }));
            this.element.appendChild(this.overlayHost);
            return;
        }
        if (connection.state === 'failed') {
            this.element.appendChild(renderFailedScreen(connection, this.onOpenDumpFile));
            this.element.appendChild(this.overlayHost);
            return;
        }

        clear(this.bodyElement);
        this.bodyElement.appendChild(renderRail(this.store, navigation => this.navigate(navigation)));
        const navigation = this.store.navigation;
        if (navigation.kind === 'collection') {
            const panel = this.getCollectionPanel(navigation.name);
            this.bodyElement.appendChild(panel.render());
            const drawer = panel.renderDrawer();
            if (drawer) {
                this.bodyElement.appendChild(drawer);
            }
        } else if (navigation.kind === 'replication') {
            this.bodyElement.appendChild(this.getToolPanel('replication').render());
        } else if (navigation.kind === 'settings') {
            this.bodyElement.appendChild(this.renderSettings());
        } else {
            this.bodyElement.appendChild(this.getToolPanel(navigation.tool).render());
        }
        this.element.appendChild(this.bodyElement);
        this.element.appendChild(this.overlayHost);
    }

    private getCollectionPanel(collectionName: string): CollectionPanel {
        let panel = this.collectionPanels.get(collectionName);
        if (!panel) {
            panel = new CollectionPanel(this.context, collectionName);
            this.collectionPanels.set(collectionName, panel);
        }
        return panel;
    }

    private getToolPanel(tool: string): Panel {
        let panel = this.toolPanels.get(tool);
        if (!panel) {
            panel = createToolPanel(tool, this.context);
            this.toolPanels.set(tool, panel);
        }
        return panel;
    }

    private getNarrowPanel(): NarrowPanel {
        if (!this.narrowPanel) {
            this.narrowPanel = new NarrowPanel(this.context);
        }
        return this.narrowPanel;
    }

    private renderSettings(): HTMLElement {
        const store = this.store;
        return el('div', { class: 'rxdt-main rxdt-scroll' }, [
            el('div', { class: 'rxdt-toolbar' }, [
                el('span', { class: 'rxdt-panel-title', text: 'Settings' })
            ]),
            el('div', { class: 'rxdt-cards' }, [
                el('div', { class: 'rxdt-card' }, [
                    el('div', { class: 'rxdt-section-label', text: 'SURFACE' }),
                    el('div', { class: 'rxdt-card-value', text: store.surface })
                ]),
                el('div', { class: 'rxdt-card' }, [
                    el('div', { class: 'rxdt-section-label', text: 'ROWS PER PAGE' }),
                    el('div', { class: 'rxdt-card-value', text: String(store.pageSize) })
                ]),
                el('div', { class: 'rxdt-card' }, [
                    el('div', { class: 'rxdt-section-label', text: 'MODE' }),
                    el('div', { class: 'rxdt-card-value', text: store.readOnly ? 'read-only' : 'read/write' })
                ])
            ]),
            el('div', { class: 'rxdt-note' }, [
                el('div', { style: { fontWeight: '700', fontSize: '12px' }, text: 'Recorded feeds' }),
                el('div', {
                    class: 'rxdt-muted',
                    style: { fontSize: '11.5px', marginTop: '4px', lineHeight: '1.55' },
                    text: 'The Changes and Replication feeds keep the most recent entries in memory only. ' +
                        'Nothing the devtool records is written back into the database.'
                })
            ])
        ]);
    }

    private openCommandPalette(): void {
        const store = this.store;
        const commands: { label: string; run: () => void; }[] = [
            ...store.collectionNames.map(name => ({
                label: 'Open collection ' + name,
                run: () => this.navigate({ kind: 'collection', name })
            })),
            { label: 'Open Live', run: () => this.navigate({ kind: 'tool', tool: 'live' }) },
            { label: 'Open Schema', run: () => this.navigate({ kind: 'tool', tool: 'schema' }) },
            { label: 'Open Changes', run: () => this.navigate({ kind: 'tool', tool: 'changes' }) },
            { label: 'Open Query lab', run: () => this.navigate({ kind: 'tool', tool: 'querylab' }) },
            { label: 'Open Storage', run: () => this.navigate({ kind: 'tool', tool: 'storage' }) },
            { label: 'Refresh', run: () => this.refresh() }
        ];
        const list = el('div');
        const renderCommands = (filter: string) => {
            clear(list);
            commands
                .filter(command => command.label.toLowerCase().includes(filter.toLowerCase()))
                .forEach(command => {
                    list.appendChild(el('div', {
                        class: 'rxdt-dropdown-row',
                        text: command.label,
                        onClick: () => {
                            this.setOverlay(null);
                            command.run();
                        }
                    }));
                });
        };
        renderCommands('');
        const input = el('input', {
            class: 'rxdt-modal-input',
            placeholder: 'Type a command…',
            onInput: (event: Event) => renderCommands((event.target as HTMLInputElement).value),
            onKeyDown: (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    this.setOverlay(null);
                }
            }
        });
        this.setOverlay(el('div', {
            class: 'rxdt-modal-backdrop',
            onClick: (event: MouseEvent) => {
                if (event.target === event.currentTarget) {
                    this.setOverlay(null);
                }
            }
        }, [
            el('div', { class: 'rxdt-modal', style: { borderTopColor: '#ED168F' } }, [
                el('div', { class: 'rxdt-modal-title', text: 'Commands' }),
                input,
                el('div', { style: { marginTop: '10px', maxHeight: '260px', overflow: 'auto' } }, [list])
            ])
        ]));
        setTimeout(() => input.focus(), 0);
    }

    private openHelp(): void {
        this.setOverlay(el('div', {
            class: 'rxdt-modal-backdrop',
            onClick: (event: MouseEvent) => {
                if (event.target === event.currentTarget) {
                    this.setOverlay(null);
                }
            }
        }, [
            el('div', { class: 'rxdt-modal', style: { borderTopColor: '#ED168F' } }, [
                el('div', { class: 'rxdt-modal-title', text: 'RxDB devtool' }),
                el('div', { class: 'rxdt-modal-body' }, [
                    document.createTextNode(
                        'Inspect and edit the data of a running RxDB database. Rows open in the drawer, ' +
                        'the checkbox selects without opening it, and every edit is previewed as the exact ' +
                        'upsert before it runs. Results are paginated at ' + this.store.pageSize + ' rows.'
                    )
                ]),
                el('div', { class: 'rxdt-modal-actions' }, [
                    el('a', {
                        href: 'https://rxdb.info/',
                        target: '_blank',
                        rel: 'noopener',
                        style: { fontSize: '11px', alignSelf: 'center' },
                        text: 'rxdb.info'
                    }),
                    el('button', {
                        class: 'rxdt-btn',
                        text: 'Close',
                        onClick: () => this.setOverlay(null)
                    })
                ])
            ])
        ]));
    }

    private observeResize(): void {
        if (typeof ResizeObserver === 'undefined') {
            return;
        }
        let wasNarrow = this.narrow;
        this.resizeObserver = new ResizeObserver(() => {
            if (this.narrow !== wasNarrow) {
                wasNarrow = this.narrow;
                this.render();
            }
        });
        this.resizeObserver.observe(this.element);
    }

    public destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.subscription?.unsubscribe();
        this.subscription = null;
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.collectionPanels.forEach(panel => panel.destroy());
        this.collectionPanels.clear();
        this.toolPanels.forEach(panel => panel.destroy());
        this.toolPanels.clear();
        this.narrowPanel?.destroy();
        this.narrowPanel = null;
        this.store.destroy();
        clear(this.element);
        if (this.ownsElement && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

function createToolPanel(tool: string, context: PanelContext): Panel {
    switch (tool) {
        case 'schema':
            return new SchemaPanel(context);
        case 'changes':
            return new ChangesPanel(context);
        case 'querylab':
            return new QueryLabPanel(context);
        case 'storage':
            return new StoragePanel(context);
        case 'replication':
            return new ReplicationPanel(context);
        default:
            return new LivePanel(context);
    }
}

function createFullScreenElement(): HTMLElement {
    const element = el('div', {
        style: {
            position: 'fixed',
            inset: '0',
            zIndex: '2147483000'
        }
    });
    document.body.appendChild(element);
    return element;
}

/**
 * The stylesheet ships inside the plugin, there are no external files.
 * It is injected once per document, including into a shadow root
 * when the devtool is mounted inside one.
 */
function injectStyle(element: HTMLElement): void {
    const root = element.getRootNode() as Document | ShadowRoot;
    const container: ParentNode = (root as Document).head ?? root;
    if ((container as Element).querySelector?.('#' + STYLE_ELEMENT_ID)) {
        return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    style.textContent = DEVTOOL_CSS;
    container.appendChild(style);
}
