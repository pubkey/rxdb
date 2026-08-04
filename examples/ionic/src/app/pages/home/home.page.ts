import { Component } from '@angular/core';
import {
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar
} from '@ionic/angular/standalone';

import { HeroInsertComponent } from '../../components/hero-insert/hero-insert.component';
import { HeroesListComponent } from '../../components/heroes-list/heroes-list.component';

@Component({
    selector: 'app-home',
    templateUrl: './home.page.html',
    styleUrls: ['./home.page.css'],
    imports: [
        IonContent,
        IonHeader,
        IonTitle,
        IonToolbar,
        HeroInsertComponent,
        HeroesListComponent
    ]
})
export class HomePage { }
