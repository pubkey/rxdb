import {
    Component,
    ElementRef,
    NgZone,
    OnDestroy,
    ViewChild,
    inject
} from '@angular/core';
import { mountRxDBViewer } from 'rxdb/plugins/dbviewer';
import type { RxDBViewerHandle } from 'rxdb/plugins/dbviewer';

import { DatabaseService } from '../../services/database.service';

/**
 * Docks the RxDB database viewer devtool to the bottom of the page.
 * The viewer is mounted lazily on the first open, so server side
 * rendering and the initial page load are not affected.
 */
@Component({
    selector: 'db-viewer',
    templateUrl: './db-viewer.component.html',
    styleUrls: ['./db-viewer.component.less'],
    providers: [DatabaseService]
})
export class DbViewerComponent implements OnDestroy {
    private dbService = inject(DatabaseService);
    private zone = inject(NgZone);

    public open = false;
    private viewerHandle?: RxDBViewerHandle;

    @ViewChild('viewerHost') viewerHost?: ElementRef<HTMLElement>;

    toggle() {
        this.open = !this.open;
        if (this.open && !this.viewerHandle) {
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
                        parent: host
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
    }
}
