import { Component, ViewChildren, Input } from '@angular/core';
import { DatabaseService } from '../../services/database.service';
import { RxDocument } from '../../../../../../';

@Component({
    selector: 'hero-edit',
    templateUrl: './hero-edit.component.html',
    styles: [String(require('./hero-edit.component.less'))],
    providers: [DatabaseService]
})
export class HeroEditComponent {

    @Input('hero') hero: RxDocument;

    constructor(
        private databaseService: DatabaseService
    ) {

    }


}
