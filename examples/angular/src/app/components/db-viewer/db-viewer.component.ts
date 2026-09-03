import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { mountRxDBDbViewer } from 'rxdb/plugins/db-viewer';
import type { DbViewerHandle } from 'rxdb/plugins/db-viewer';

import { DatabaseService } from '../../services/database.service';

/**
 * Opens the RxDB database viewer on top of the app.
 * @link https://rxdb.info/db-viewer.html
 */
@Component({
    selector: 'db-viewer',
    templateUrl: './db-viewer.component.html',
    providers: [DatabaseService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButton, MatIcon]
})
export class DbViewerComponent implements OnDestroy {

    public isOpen = false;

    private dbViewer?: DbViewerHandle;
    private overlay?: HTMLElement;

    constructor(
        private dbService: DatabaseService
    ) { }

    /**
     * The overlay is built outside of the angular template so that it sits
     * above the app regardless of the stacking contexts around this component.
     */
    open() {
        if (this.isOpen) {
            return;
        }
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '9000',
            display: 'flex',
            flexDirection: 'column',
            background: '#0D0F18'
        });

        const target = document.createElement('div');
        Object.assign(target.style, { flex: '1', minHeight: '0' });

        overlay.appendChild(target);
        document.body.appendChild(overlay);

        this.overlay = overlay;
        /**
         * The viewer draws its own close button, so closing is reported back
         * here instead of being wrapped in another bar.
         */
        this.dbViewer = mountRxDBDbViewer(this.dbService.db as any, {
            target,
            onClose: () => this.close()
        });
        this.isOpen = true;
    }

    close() {
        this.dbViewer?.destroy();
        this.dbViewer = undefined;
        this.overlay?.remove();
        this.overlay = undefined;
        this.isOpen = false;
    }

    ngOnDestroy() {
        this.close();
    }
}
