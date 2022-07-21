import {
    Component,
    ViewChild,
    ChangeDetectionStrategy
} from '@angular/core';
import { DatabaseService } from '../../services/database.service';

@Component({
    selector: 'hero-insert',
    templateUrl: './hero-insert.component.html',
    styleUrls: ['./hero-insert.component.less'],
    providers: [DatabaseService],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroInsertComponent {

    @ViewChild('input', { static: false }) inputfield: any;

    name = '';
    color = '';

    constructor(
        private dbService: DatabaseService
    ) {
        this.reset();
    }

    reset() {
        this.name = '';
        this.color = '';
    }

    async submit() {
        console.log('HeroInsertComponent.submit():');
        console.log('name: ' + this.name);
        console.log('color: ' + this.color);

        try {
            await this.dbService.db.hero.insert({
                name: this.name,
                color: this.color,
                maxHP: getRandomArbitrary(100, 1000)
            });
            this.reset();
        } catch (err) {
            alert('Error: Please check console');
            console.error('hero-insert.submit(): error:');
            throw err;
        }

        this.inputfield.nativeElement.focus();
    }
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 * @link https://stackoverflow.com/a/1527820/3443137
 */
function getRandomArbitrary(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}
