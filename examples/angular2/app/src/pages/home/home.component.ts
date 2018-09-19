import { Component } from '@angular/core';
import { RxDocument } from '../../../../../../';
import {
    RxHeroDocument
} from '../../RxDB.d';


@Component({
    templateUrl: './home.component.html',
    styles: [String(require('./home.component.less'))],
})
export class HomeComponent {

    editedHero: RxHeroDocument;

    constructor() { }
    ngOnInit() { }

    /**
     * this method exists to play arround with the typings
     */
    foo() {
        const x: number = this.editedHero.hpPercent();
    }

    editHero(hero: RxHeroDocument) {
        this.editedHero = hero;
    }
}
