import { Component, ViewChildren, Input } from '@angular/core';
import { DatabaseService } from '../../services/database.service';

@Component({
    selector: 'hero-insert',
    templateUrl: './hero-insert.component.html',
    styles: [String(require('./hero-insert.component.less'))],
    providers: [DatabaseService]
})
export class HeroInsertComponent {

    @ViewChildren('input') inputfield;

    name = '';
    color = '';

    constructor(
        private databaseService: DatabaseService
    ) {

    }



    async submit() {
        console.log('HeroInsertComponent.submit():');
        if (this.name == '' || this.color == '') return;

        const addDoc = {
            name: this.name,
            color: this.color
        };

        this.name = '';
        this.color = '';

        const db = await this.databaseService.get();
        db['hero'].insert(addDoc);

        this.inputfield.first._inputElement.nativeElement.focus();
    }


}
