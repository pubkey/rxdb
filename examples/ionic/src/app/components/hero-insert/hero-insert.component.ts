import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    ToastController
} from '@ionic/angular/standalone';

import { DatabaseService } from '../../services/database.service';

@Component({
    selector: 'hero-insert',
    templateUrl: './hero-insert.component.html',
    styleUrls: ['./hero-insert.component.css'],
    providers: [DatabaseService],
    imports: [
        FormsModule,
        IonButton,
        IonCard,
        IonCardContent,
        IonCardHeader,
        IonCardTitle,
        IonInput,
        IonItem,
        IonLabel,
        IonList
    ]
})
export class HeroInsertComponent {

    private dbService = inject(DatabaseService);
    private toastController = inject(ToastController);

    name = signal('');
    color = signal('#e6008d');

    async submit() {
        const name = this.name().trim();
        const color = this.color();
        if (name === '' || color === '') {
            return;
        }

        try {
            await this.dbService.db.hero.insert({
                name,
                color,
                hp: 100
            });
            this.name.set('');
        } catch (err: any) {
            const toast = await this.toastController.create({
                message: err.message,
                duration: 3000,
                color: 'danger'
            });
            await toast.present();
        }
    }
}
