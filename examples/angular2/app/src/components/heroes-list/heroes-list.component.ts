import {
    Component,
    Output,
    EventEmitter,
    ChangeDetectorRef,
    ChangeDetectionStrategy
} from '@angular/core';
import {
    Observable,
} from 'rxjs';
import {
    tap
} from 'rxjs/operators';

import { DatabaseService } from '../../services/database.service';
import {
    RxHeroDocument
} from '../../RxDB.d';

@Component({
    selector: 'heroes-list',
    templateUrl: './heroes-list.component.html',
    styles: [String(require('./heroes-list.component.less'))],
    providers: [DatabaseService],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroesListComponent {

    private emittedFirst = false;
    private heroes$: Observable<RxHeroDocument[]>;
    @Output('edit') editChange: EventEmitter<RxHeroDocument> = new EventEmitter();

    constructor(
        private dbService: DatabaseService,
        private _cdr: ChangeDetectorRef
    ) {
        this.heroes$ = this.dbService
            .db.hero                // collection
            .find().sort('name')    // query
            .$.pipe(                // observable
                dbService.tapWithChangeDetection(this._cdr), // run change-detection on each emit
                tap(() => this.emittedFirst = true)          // hide loading-icon on first emit
            );
    }

    set edit(hero) {
        console.log('editHero: ' + hero.name);
        this.editChange.emit(hero);
    }
    editHero(hero) {
        this.edit = hero;
    }
    deleteHero(hero) {
        hero.remove();
    }

    /**
     * this method exists to play arround with the typings
     */
    async foo(): Promise<string> {
        const db = this.dbService.db;
        const firstDoc = await db.hero.findOne().exec();
        const f: string = firstDoc.color;
        return f;
    }
}
