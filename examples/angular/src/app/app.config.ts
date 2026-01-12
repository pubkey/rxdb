import { ApplicationConfig, APP_ID, enableProdMode, provideAppInitializer, importProvidersFrom } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { environment } from '../environments/environment';
import { initDatabase, DatabaseService } from './services/database.service';
import { routes } from './app.routes';

if (environment.production) {
  enableProdMode();
}

export const appConfig: ApplicationConfig = {
    providers: [
        importProvidersFrom(
            FormsModule,
            ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
            MatButtonModule,
            MatCardModule,
            MatDialogModule,
            MatFormFieldModule,
            MatIconModule,
            MatInputModule,
            MatListModule,
            MatProgressSpinnerModule,
        ),
        { provide: APP_ID, useValue: 'serverApp' },
        provideAppInitializer(() => initDatabase()),
        DatabaseService,
        provideClientHydration(),
        provideRouter(routes)
    ]
};
