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

    name: string = '';
    color: string = '';

    constructor(
        private databaseService: DatabaseService
    ) {

    }



    submit() {
        console.log('HeroInsertComponent.submit():');
        if(this.name=='' || this.color=='') return;

        const addDoc = {
            name: this.name,
            color: this.color
        };

        this.name = '';
        this.color = '';

        this.inputfield.first._inputElement.nativeElement.focus();

        this.databaseService.get()
            .catch(e => console.log('cant get database'))
            .then(db => db.collection('hero'))
            .then(col => col.insert(addDoc))
            .then(d => console.log('done!'));
    }


}
