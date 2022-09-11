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

@Component({
    selector: 'hero-edit',
    templateUrl: './hero-edit.component.html',
    styleUrls: ['./hero-edit.component.less'],
    providers: [],
})
export class HeroEditDialogComponent implements OnInit {
    public synced: boolean = true;
    public formValue = 0;
    private subs: Subscription[] = [];

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

        await this.data.hero.atomicPatch({ hp: this.formValue });
        this.dialogRef.close();
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
