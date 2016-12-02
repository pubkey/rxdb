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
        // console.log('constructor');
    }

    ngAfterContentInit() { }

    ngOnInit() {
        // console.log('ngOnInit');
        // console.dir(this.databaseService.get());

        this.databaseService.get()
            .then(db => db.collection('hero'))
            .then(col => col
                .query()
                .sort({ name: 1 })
                .$
            )
            .then($ => this.sub = $.subscribe(heroes => {
                // console.log('observable fired');
                // console.dir(heroes);
                this.heroes = heroes;
                this.zone.run(() => {});
            }));
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}
