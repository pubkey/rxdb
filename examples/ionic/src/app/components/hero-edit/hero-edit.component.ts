import { Component, Input, OnInit, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonRange,
    IonTitle,
    IonToolbar,
    ModalController
} from '@ionic/angular/standalone';

import type { RxHeroDocument } from '../../RxDB.d';

@Component({
    selector: 'hero-edit',
    templateUrl: './hero-edit.component.html',
    styleUrls: ['./hero-edit.component.css'],
    imports: [
        AsyncPipe,
        IonButton,
        IonButtons,
        IonContent,
        IonHeader,
        IonItem,
        IonLabel,
        IonRange,
        IonTitle,
        IonToolbar
    ]
})
export class HeroEditComponent implements OnInit {

    @Input() hero!: RxHeroDocument;

    hp = signal(100);

    constructor(private modalController: ModalController) { }

    ngOnInit() {
        this.hp.set(this.hero.hp);
    }

    /**
     * incrementalPatch() reruns the modification when the document
     * was changed in between, so no update gets lost.
     * @link https://rxdb.info/rx-document.html
     */
    async submit() {
        await this.hero.incrementalPatch({ hp: this.hp() });
        await this.modalController.dismiss();
    }

    async cancel() {
        await this.modalController.dismiss();
    }
}
