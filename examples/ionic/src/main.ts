import { bootstrapApplication } from '@angular/platform-browser';
import { provideAppInitializer } from '@angular/core';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { DatabaseService, initDatabase } from './app/services/database.service';

bootstrapApplication(AppComponent, {
    providers: [
        provideIonicAngular({ mode: 'md' }),
        provideRouter(routes),
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        /**
         * Create the database before the app starts up
         * so that the components can use it synchronously.
         */
        provideAppInitializer(() => initDatabase()),
        DatabaseService
    ]
}).catch(err => console.error(err));
