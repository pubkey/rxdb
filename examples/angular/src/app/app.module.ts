import { NgModule, APP_INITIALIZER, Injector } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';

/**
 * COMPONENTS
 */
import { HeroesListComponent } from './components/heroes-list/heroes-list.component';
import { HeroInsertComponent } from './components/hero-insert/hero-insert.component';
import { HeroEditDialogComponent } from './components/hero-edit/hero-edit.component';
import { AppComponent } from './app.component';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

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
    HeroEditDialogComponent
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
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (injector: Injector) => () => initDatabase(injector),
      multi: true,
      deps: [Injector]
    },
    DatabaseService,
    {
      provide: MatDialogRef,
      useValue: {}
    },
    { provide: MAT_DIALOG_DATA, useValue: {} },
    provideClientHydration()
  ],
  exports: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
