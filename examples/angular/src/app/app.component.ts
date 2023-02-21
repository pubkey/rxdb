import { Component } from '@angular/core';
import {
  RxHeroDocument
} from './RxDB.d';


/**
 * IMPORTANT: RxDB creates rxjs observables outside of angulars zone
 * So you have to import the rxjs patch to ensure changedetection works correctly.
 * @link https://www.bennadel.com/blog/3448-binding-rxjs-observable-sources-outside-of-the-ngzone-in-angular-6-0-2.htm
 */
 import 'zone.js/dist/zone-patch-rxjs';
 
 @Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less'],
})
export class AppComponent {
  title = 'angular';

  public editedHero?: RxHeroDocument;

  constructor() { }
  ngOnInit() { }

  /**
   * this method exists to play around with the typings
   */
  foo() {
    // const x: number = this.editedHero.hpPercent();
  }

  editHero(hero: RxHeroDocument) {
    this.editedHero = hero;
  }
}
