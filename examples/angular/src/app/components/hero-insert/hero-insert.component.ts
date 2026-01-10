import {
    Component,
    ViewChild,
    ChangeDetectionStrategy,
    ChangeDetectorRef
} from '@angular/core';
import { ensureNotFalsy, RxError } from 'rxdb';
import { DatabaseService } from '../../services/database.service';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'hero-insert',
    templateUrl: './hero-insert.component.html',
    styleUrls: ['./hero-insert.component.less'],
    providers: [DatabaseService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatFormField, MatInput, FormsModule, MatButton]
})
export class HeroInsertComponent {

    @ViewChild('input', { static: false }) inputfield: any;

    name = '';
    color = '';

    public errors: {
        name?: string;
        color?: string;
    } = {};

    constructor(
        private dbService: DatabaseService,
        private cdr: ChangeDetectorRef
    ) {
    }

    public randomString() {
        return getRandomArbitrary(1, 1000000) + '_' + new Date().getTime() + '_random_string_to_disable_autocomplete';
    }

    reset() {
        this.name = '';
        this.color = '';
        this.errors = {};
    }

    async submit() {
        console.log('HeroInsertComponent.submit():');
        console.log('name: ' + this.name);
        console.log('color: ' + this.color);

        try {
            await this.dbService.db.hero.insert({
                name: this.name,
                color: this.color,
                hp: 100
            });
            this.reset();
        } catch (err: any) {
            alert('Error: Please check console');
            console.error('hero-insert.submit(): error:');
            console.dir(err);

            const innerError = ensureNotFalsy((err as RxError).parameters.errors)[0];
            const errorField = (innerError as any).instancePath.substring(1);
            console.log('errorField ' + errorField);
            (this.errors as any)[errorField] = innerError.message;
            console.dir(this.errors);
            this.cdr.detectChanges();
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
