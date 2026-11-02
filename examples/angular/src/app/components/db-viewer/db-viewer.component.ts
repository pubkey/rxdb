import {
    AfterViewInit,
    Component,
    ElementRef,
    NgZone,
    OnDestroy,
    OnInit,
    ViewChild,
    inject,
    signal
} from '@angular/core';
import { connectRxDBViewer, mountRxDBViewer } from 'rxdb/plugins/dbviewer';
import type { RxDBViewerConnectHandle, RxDBViewerHandle } from 'rxdb/plugins/dbviewer';

import { DatabaseService } from '../../services/database.service';

/**
 * Docks the RxDB database viewer devtool to the bottom of the page.
 * The viewer is mounted lazily on the first open, so server side
 * rendering and the initial page load are not affected.
 *
 * On load the viewer url is logged to the browser console.
 * Opening the app with #dbviewer in the url opens the viewer directly.
 * Opening the app with ?debug=dbviewer-webrtc connects the database
 * over WebRTC and logs the pairing url to open from another device.
 */
@Component({
    selector: 'db-viewer',
    templateUrl: './db-viewer.component.html',
    styleUrls: ['./db-viewer.component.less'],
    providers: [DatabaseService]
})
export class DbViewerComponent implements OnInit, AfterViewInit, OnDestroy {
    private dbService = inject(DatabaseService);
    private zone = inject(NgZone);

    public readonly open = signal(false);
    private viewerHandle?: RxDBViewerHandle;
    private connectHandle?: RxDBViewerConnectHandle;

    @ViewChild('viewerHost') viewerHost?: ElementRef<HTMLElement>;

    ngOnInit() {
        if (typeof window === 'undefined') {
            return;
        }
        const viewerUrl = window.location.origin + window.location.pathname + '#dbviewer';
        console.log(
            '%c RxDB %c db-viewer: ' + viewerUrl + ' (or click the "Open DB Viewer" button in the bottom right corner)',
            'background:#ED168F;color:#FFFFFF;font-weight:bold;',
            ''
        );
        if (new URLSearchParams(window.location.search).get('debug') === 'dbviewer-webrtc') {
            this.zone.runOutsideAngular(() => {
                connectRxDBViewer({
                    database: this.dbService.db as any,
                    /**
                     * Local copy of the hosted viewer page
                     * (see postinstall:dbviewer). The pairing data
                     * travels in the url hash, so the page connects
                     * on open without further input.
                     */
                    viewerUrl: window.location.origin + '/assets/dbviewer.html'
                }).then(handle => {
                    this.connectHandle = handle;
                    console.log(
                        '%c RxDB %c dbviewer pairing url: ' + handle.url,
                        'background:#ED168F;color:#FFFFFF;font-weight:bold;',
                        ''
                    );
                }).catch(err => console.error('dbviewer webrtc connect failed', err));
            });
        }
    }

    ngAfterViewInit() {
        if (typeof window !== 'undefined' && window.location.hash.includes('dbviewer')) {
            /**
             * Deferred into a macrotask so the state change lands
             * in a fresh change detection cycle instead of after
             * the ngAfterViewInit check.
             */
            setTimeout(() => this.toggle());
        }
    }

    toggle() {
        this.open.set(!this.open());
        if (this.open() && !this.viewerHandle) {
            /**
             * The viewer runs its own intervals and DOM updates,
             * mounting outside of the angular zone keeps them
             * out of change detection.
             */
            setTimeout(() => {
                const host = this.viewerHost ? this.viewerHost.nativeElement : undefined;
                if (!host || this.viewerHandle) {
                    return;
                }
                this.zone.runOutsideAngular(() => {
                    this.viewerHandle = mountRxDBViewer({
                        database: this.dbService.db as any,
                        parent: host,
                        showCloseButton: true,
                        /**
                         * Local copy of the hosted viewer page
                         * (see postinstall:dbviewer), so the example
                         * works offline and against unreleased builds.
                         */
                        viewerUrl: 'assets/dbviewer.html'
                    });
                    /**
                     * The close icon lives inside the viewer chrome,
                     * the host only decides what closing means:
                     * here it hides the dock.
                     */
                    this.viewerHandle.close$.subscribe(() => {
                        this.zone.run(() => this.open.set(false));
                    });
                });
            });
        }
    }

    ngOnDestroy() {
        if (this.viewerHandle) {
            this.viewerHandle.remove();
            this.viewerHandle = undefined;
        }
        if (this.connectHandle) {
            this.connectHandle.close();
            this.connectHandle = undefined;
        }
    }
}
