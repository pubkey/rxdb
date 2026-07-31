import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonIcon,
    IonItem,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonLabel,
    IonList,
    IonProgressBar,
    IonSpinner,
    ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { create, trash } from 'ionicons/icons';
import type { Observable } from 'rxjs';

import type { RxHeroDocument } from '../../RxDB.d';
import { DatabaseService } from '../../services/database.service';
import { HeroEditComponent } from '../hero-edit/hero-edit.component';

@Component({
    selector: 'heroes-list',
    templateUrl: './heroes-list.component.html',
    styleUrls: ['./heroes-list.component.css'],
    providers: [DatabaseService],
    imports: [
        AsyncPipe,
        IonCard,
        IonCardContent,
        IonCardHeader,
        IonCardTitle,
        IonIcon,
        IonItem,
        IonItemOption,
        IonItemOptions,
        IonItemSliding,
        IonLabel,
        IonList,
        IonProgressBar,
        IonSpinner
    ]
})
export class HeroesListComponent {

    private dbService = inject(DatabaseService);
    private modalController = inject(ModalController);

    /**
     * A query returns an observable that emits a new result
     * whenever a matching document changes.
     * @link https://rxdb.info/rx-query.html
     */
    heroes$: Observable<RxHeroDocument[]> = this.dbService.db.hero
        .find({
            selector: {},
            sort: [{ name: 'asc' }]
        })
        .$;

    constructor() {
        addIcons({ create, trash });
    }

    async editHero(hero: RxHeroDocument) {
        const modal = await this.modalController.create({
            component: HeroEditComponent,
            componentProps: { hero }
        });
        await modal.present();
    }

    async deleteHero(hero: RxHeroDocument) {
        await hero.remove();
    }
}
