import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnInit,
    ChangeDetectorRef,
    Inject
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
    Subscription
} from 'rxjs';
import {
    skip
} from 'rxjs/operators';
import { RxHeroDocument } from 'src/app/RxDB';
import {
    ensureNotFalsy,
    RxError
} from 'rxdb';
import { MatCard, MatCardHeader, MatCardAvatar, MatCardTitle, MatCardSubtitle, MatCardContent } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'hero-edit',
    templateUrl: './hero-edit.component.html',
    styleUrls: ['./hero-edit.component.less'],
    providers: [],
    imports: [MatCard, MatCardHeader, MatCardAvatar, MatCardTitle, MatCardSubtitle, MatCardContent, MatButton, MatFormField, MatInput, FormsModule, MatError, AsyncPipe]
})
export class HeroEditDialogComponent implements OnInit {
    public synced: boolean = true;
    public formValue = 0;
    private subs: Subscription[] = [];
    public error?: string;

    constructor(
        private cdr: ChangeDetectorRef,
        public dialogRef: MatDialogRef<HeroEditDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: {
            hero: RxHeroDocument
        }
    ) {
        this.synced = true;
    }

    ngOnInit() {
        if (!this.data.hero) {
            console.dir(this.data);
            throw new Error('hero is missing');
        }
        this.formValue = this.data.hero.hp;
        this.subs.push(
            this.data.hero.$
                .pipe(
                    skip(1)
                )
                .subscribe(() => {
                    this.synced = false;
                    this.cdr.detectChanges();
                })
        );
    }

    async submit() {
        if (!this.data.hero) {
            throw new Error('should never happen');
        }
        try {
            await this.data.hero.incrementalPatch({ hp: this.formValue });
            this.dialogRef.close();
        } catch (err) {
            const errorMessage = ensureNotFalsy((err as RxError).parameters.errors)[0].message;
            console.log('error: ' + errorMessage);
            console.dir(err);
            this.error = errorMessage;
            this.cdr.detectChanges();
        }
    }

    resync() {
        if (!this.data.hero) {
            throw new Error('should never happen');
        }
        this.formValue = this.data.hero.hp;
        this.synced = true;
        this.cdr.detectChanges();
    }

    async cancel() {
        this.dialogRef.close();
    }

    ngOnDestroy() {
        this.subs.forEach(sub => sub.unsubscribe());
    }
}
