import { Component, ViewChildren, Input, OnChanges, Output, EventEmitter } from '@angular/core';
import { DatabaseService } from '../../services/database.service';
import { RxDocument } from '../../../../../../';

@Component({
    selector: 'hero-edit',
    templateUrl: './hero-edit.component.html',
    styles: [String(require('./hero-edit.component.less'))],
    providers: [DatabaseService],
})
export class HeroEditComponent {

    @Input('hero') hero: RxDocument;
    @Output('done') done = new EventEmitter();

    constructor(
        private databaseService: DatabaseService
    ) { }

    async submit() {
        await this.hero.save();
        this.done.emit(true);
    }
}
