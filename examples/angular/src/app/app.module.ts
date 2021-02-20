import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';

/**
 * COMPONENTS
 */
import { HeroesListComponent } from './components/heroes-list/heroes-list.component';
import { HeroInsertComponent } from './components/hero-insert/hero-insert.component';
import { HeroEditComponent } from './components/hero-edit/hero-edit.component';
import { AppComponent } from './app.component';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * SERVICES
 */
import { DatabaseService } from './services/database.service';
import {
  initDatabase
} from './services/database.service';

@NgModule({
  declarations: [
    AppComponent,
    HeroesListComponent,
    HeroInsertComponent,
    HeroEditComponent
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'serverApp' }),
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
    DatabaseService
  ],
  exports: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
