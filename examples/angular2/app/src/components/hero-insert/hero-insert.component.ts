import { Component, ViewChild, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatabaseService } from '../../services/database.service';
import * as randomInt from 'random-int';

@Component({
    selector: 'hero-insert',
    templateUrl: './hero-insert.component.html',
    styles: [String(require('./hero-insert.component.less'))],
    providers: [DatabaseService],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroInsertComponent {

    @ViewChild('input') inputfield;

    tempDoc: any;

    constructor(
        private dbService: DatabaseService
    ) {
        this.reset();
    }

    reset() {
        this.tempDoc = this.dbService.db.hero.newDocument({
            maxHP: randomInt(100, 1000)
        });
    }

    async submit() {
        console.log('HeroInsertComponent.submit():');
        console.log('name: ' + this.tempDoc.name);
        console.log('color: ' + this.tempDoc.color);

        try {
            await this.tempDoc.save();
            this.reset();
        } catch (err) {
            alert('Error: Please check console');
            console.error('hero-insert.submit(): error:');
            throw err;
        }

        this.inputfield.nativeElement.focus();
    }


}
