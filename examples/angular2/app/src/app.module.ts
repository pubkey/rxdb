import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { routing, appRoutingProviders } from './app.routes';
import { FormsModule } from '@angular/forms';
import { MatCardModule, MatListModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule } from '@angular/material';

import {
    APP_BASE_HREF,
    LocationStrategy,
    PathLocationStrategy
} from '@angular/common';


/**
 * STYLES
 */
require("./styles.global.less");
require("normalize.css");

/**
 * PAGES
 */
import { AppComponent } from './components/app/app.component';
import { HomeComponent } from './pages/home/home.component';

/**
 * COMPONENTS
 */
import { HeroesListComponent } from './components/heroes-list/heroes-list.component';
import { HeroInsertComponent } from './components/hero-insert/hero-insert.component';
import { HeroEditComponent } from './components/hero-edit/hero-edit.component';

/**
 * SERVICES
 */
import { DatabaseService } from './services/database.service';
import {
    initDatabase
} from './services/database.service';

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        routing,
        MatCardModule, MatListModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            useFactory: () => initDatabase,
            multi: true,
            deps: [/* your dependencies */]
        },
        DatabaseService,
        appRoutingProviders,
        { provide: APP_BASE_HREF, useValue: '/' },
        {
            provide: LocationStrategy,
            useClass: PathLocationStrategy
        }
    ],
    declarations: [
        AppComponent,
        HomeComponent,
        HeroesListComponent,
        HeroInsertComponent,
        HeroEditComponent
    ],
    bootstrap: [
        AppComponent
    ]
})
export class AppModule { }
