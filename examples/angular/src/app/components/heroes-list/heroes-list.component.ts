import {
    Component,
    Output,
    EventEmitter,
    ChangeDetectionStrategy,
    Signal
} from '@angular/core';
import type {
    Observable
} from 'rxjs';
import {
    tap
} from 'rxjs/operators';

import { DatabaseService } from '../../services/database.service';
import type {
    RxHeroDocument
} from '../../RxDB.d';


import { MatDialog } from '@angular/material/dialog';
import { HeroEditDialogComponent } from '../hero-edit/hero-edit.component';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatList, MatListItem, MatDivider } from '@angular/material/list';
import { AsyncPipe } from '@angular/common';
import { MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
    selector: 'heroes-list',
    templateUrl: './heroes-list.component.html',
    styleUrls: ['./heroes-list.component.less'],
    providers: [DatabaseService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatProgressSpinner, MatList, MatListItem, MatDivider, MatMiniFabButton, MatIcon, AsyncPipe]
})
export class HeroesListComponent {

    public emittedFirst = false;
    public heroes$: Observable<RxHeroDocument[]>;

    /**
     * You can also get singals instead of observables
     * @link https://rxdb.info/reactivity.html
     */
    public heroCount$$: Signal<unknown>;

    @Output('edit') editChange: EventEmitter<RxHeroDocument> = new EventEmitter();

    constructor(
        private dbService: DatabaseService,
        private dialog: MatDialog
    ) {
        this.heroCount$$ = dbService.db.hero.count().$$;
        this.heroes$ = this.dbService
            .db.hero                // collection
            .find({                 // query
                selector: {},
                sort: [{ name: 'asc' }]
            })
            .$                      // observable
            .pipe(
                tap(() => {
                    /**
                     * hide loading icon on first emit
                     */
                    this.emittedFirst = true;
                })
            );
    }

    editHero(hero: RxHeroDocument) {
        let dialogRef = this.dialog.open(HeroEditDialogComponent, {
            height: '400px',
            width: '600px',
            data: {
                hero
            }
        });
    }
    deleteHero(hero: RxHeroDocument) {
        hero.remove();
    }

    /**
     * this method exists to play around with the typings
     */
    async foo(): Promise<string> {
        const db = this.dbService.db;
        const firstDoc = await db.hero.findOne().exec();
        if (!firstDoc) return 'not found';
        const f: string = firstDoc.color;
        return f;
    }
}
