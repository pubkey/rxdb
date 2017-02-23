import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import {Observable} from 'rxjs';
import { RxDocument } from '../../../../../../';

import { DatabaseService } from '../../services/database.service';
import { Hero } from '../../logic/hero';


@Component({
    selector: 'heroes-list',
    templateUrl: './heroes-list.component.html',
    styles: [String(require('./heroes-list.component.less'))],
    providers: [DatabaseService]
})
export class HeroesListComponent implements OnInit, OnDestroy {


    heroes: RxDocument[];
    sub;

    constructor(
        private databaseService: DatabaseService,
        private zone: NgZone
    ) {
    }

    ngAfterContentInit() { }

    private async _show() {
        const db = await this.databaseService.get();
        const heroes$ = db['hero']
            .find()
            .sort({ name: 1 })
            .$;
        this.sub = heroes$.subscribe(heroes => {
            this.heroes = heroes;
            this.zone.run(() => { });
        });
    }

    ngOnInit() {
        this._show();
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}
