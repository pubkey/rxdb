import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, APP_INITIALIZER } from '@angular/core';

/**
 * COMPONENTS
 */
import { HeroesListComponent } from './components/heroes-list/heroes-list.component';
import { HeroInsertComponent } from './components/hero-insert/hero-insert.component';
import { HeroEditComponent } from './components/hero-edit/hero-edit.component';
import { AppComponent } from './app.component';
import {
  MatCardModule,
  MatListModule,
  MatFormFieldModule,
  MatInputModule,
  MatProgressSpinnerModule
} from '@angular/material';

/**
 * SERVICES
 */
import { DatabaseService } from './services/database.service';
import {
  initDatabase
} from './services/database.service';

/**
 * PIPES
 */
import {
  AsyncNoZonePipe
} from './pipes/async-no-zone.pipe';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    HeroesListComponent,
    HeroInsertComponent,
    HeroEditComponent,
    AsyncNoZonePipe
  ],
  imports: [
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    MatCardModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: () => initDatabase,
      multi: true,
      deps: [/* your dependencies */]
    },
    DatabaseService,
    AsyncNoZonePipe
  ],
  exports: [
    AsyncNoZonePipe
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
