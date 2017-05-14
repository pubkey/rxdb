import {BrowserModule} from "@angular/platform-browser";
import {ErrorHandler, NgModule} from "@angular/core";
import {IonicApp, IonicErrorHandler, IonicModule} from "ionic-angular";
import {SplashScreen} from "@ionic-native/splash-screen";
import {StatusBar} from "@ionic-native/status-bar";

import {MyApp} from "./app.component";
import {HomePage} from "../pages/home/home";
import {FormsModule} from "@angular/forms";
import {HeroesListComponent} from "./components/heroes-list/heroes-list.component";
import {HeroEditComponent} from "./components/hero-edit/hero-edit.component";
import {HeroInsertComponent} from "./components/hero-insert/hero-insert.component";
import {DatabaseService} from "./services/database.service";

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    HeroesListComponent,
    HeroInsertComponent,
    HeroEditComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    IonicModule.forRoot(MyApp)
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    DatabaseService
  ]
})
export class AppModule {
}
