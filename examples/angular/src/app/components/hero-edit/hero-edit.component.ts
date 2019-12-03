import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnInit,
    ChangeDetectorRef
} from '@angular/core';
import {
    Subscription
} from 'rxjs';
import {
    skip
} from 'rxjs/operators';

@Component({
    selector: 'hero-edit',
    templateUrl: './hero-edit.component.html',
    styleUrls: ['./hero-edit.component.less'],
    providers: [],
})
export class HeroEditComponent implements OnInit {

    @Input('hero') hero: any;
    @Output('done') done = new EventEmitter();

    public synced: Boolean = true;
    public formValue = 0;
    private subs: Subscription[] = [];

    constructor(
        private _cdr: ChangeDetectorRef
    ) {
        this.synced = true;
    }

    ngOnInit() {
        this.formValue = this.hero.hp;
        this.subs.push(
            this.hero.$
                .pipe(
                    skip(1)
                )
                .subscribe(() => {
                    this.synced = false;
                    this._cdr.detectChanges();
                })
        );
    }

    async submit() {
        await this.hero.atomicSet('hp', this.formValue);
        this.done.emit(true);
    }

    resync() {
        this.formValue = this.hero.hp;
        this.synced = true;
        this._cdr.detectChanges();
    }

    async cancel() {
        this.done.emit(false);
    }

    ngOnDestroy() {
        this.subs.forEach(sub => sub.unsubscribe());
    }
}
