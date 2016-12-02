import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { routing, appRoutingProviders } from './app.routes';
import { FormsModule }   from '@angular/forms';

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


/**
 * SERVICES
 */
import { DatabaseService } from './services/database.service';

/**
 * material2
 * @link https://github.com/jelbourn/material2-app/blob/master/src/main.ts
 * @link https://github.com/jelbourn/material2-app/blob/master/src/app/material2-app.component.html
 */
import {MdCardModule} from '@angular2-material/card/card';
import {MdCheckboxModule} from '@angular2-material/checkbox/checkbox';
import {MdTabsModule} from '@angular2-material/tabs';
/** @link https://github.com/angular/material2/blob/master/src/lib/input/README.md */
import {MdInputModule} from '@angular2-material/input/input';
import {MdButtonModule} from '@angular2-material/button/button';
import {MdProgressCircleModule} from '@angular2-material/progress-circle/progress-circle';
import {MdListModule} from '@angular2-material/list/list';

@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        routing,
        MdCardModule,
        MdInputModule,
        MdButtonModule,
        MdProgressCircleModule,
        MdListModule
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
        HeroInsertComponent
    ],
    bootstrap: [
        AppComponent
    ]
})
export class AppModule { }
