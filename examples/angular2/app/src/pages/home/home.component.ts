import {Component} from '@angular/core';
import { RxDocument } from '../../../../../../';

@Component({
    templateUrl: './home.component.html',
    styles: [String(require('./home.component.less'))],
})
export class HomeComponent {

    editedHero: RxDocument;

    constructor() { }
    ngOnInit() { }

    editHero(hero) {
        this.editedHero = hero;
    }
}
