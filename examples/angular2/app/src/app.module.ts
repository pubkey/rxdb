import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { routing, appRoutingProviders } from './app.routes';
import { FormsModule }   from '@angular/forms';
import { MaterialModule } from '@angular/material';


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


@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        routing,
        MaterialModule
    ],
    providers: [
        DatabaseService,
        appRoutingProviders,
        { provide: APP_BASE_HREF, useValue: '/' },
        {
            provide: LocationStrategy,
            useClass: PathLocationStrategy
        },
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
