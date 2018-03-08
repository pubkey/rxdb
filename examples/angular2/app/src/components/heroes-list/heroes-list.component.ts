import { Component, OnInit, OnDestroy, NgZone, Output, EventEmitter } from '@angular/core';
import { DatabaseService } from '../../services/database.service';
import * as RxDBTypes from '../../RxDB.d';

// override Observable
import { Observable } from 'rxjs-ng-extras';

@Component({
    selector: 'heroes-list',
    templateUrl: './heroes-list.component.html',
    styles: [String(require('./heroes-list.component.less'))],
    providers: [DatabaseService]
})
export class HeroesListComponent implements OnInit, OnDestroy {

    heroes: RxDBTypes.RxHeroDocument[] | RxDBTypes.RxHeroDocument;
    sub;

    @Output('edit') editChange: EventEmitter<RxDBTypes.RxHeroDocument> = new EventEmitter();
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

    constructor(
        private databaseService: DatabaseService,
        private zone: NgZone
    ) {
    }

    ngAfterContentInit() { }

    private async _show() {
        const db = await this.databaseService.get();

        /**
          NOTE: Angular change detection only tracks variables within
          an Angular `zone`.  Since rxdb's functions are defined outside
          the zone, we need to wrap observables using observeOnZone for
          change detection to work.
        **/
        const heroes$ = (<Observable>db.hero
            .find()
            .sort({ name: 1 })
            .$)
            .observeOnZone(this.zone);

        this.sub = heroes$.subscribe(heroes => {
            NgZone.assertInAngularZone();  // NOTE: Validation for observeOnZone above
            this.heroes = heroes;
        });
    }


    /**
     * this method exists to play arround with the typings
     */
    async foo() {
        const db = await this.databaseService.get();
        const firstDoc = await db.hero.findOne().exec();
        const f: string = firstDoc.color;
    }

    ngOnInit() {
        this._show();
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}
