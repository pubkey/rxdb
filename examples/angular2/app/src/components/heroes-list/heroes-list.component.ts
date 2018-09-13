import { Component, OnInit, OnDestroy, NgZone, Output, EventEmitter } from '@angular/core';
import { DatabaseService } from '../../services/database.service';
import * as RxDBTypes from '../../RxDB.d';


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
        const heroes$ = db.hero
            .find()
            .sort({ name: 1 })
            .$;
        this.sub = heroes$.subscribe(heroes => {
            console.log('heroes:');
            console.dir(heroes);

            this.heroes = heroes;
            this.zone.run(() => { });
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
