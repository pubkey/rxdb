import { Component } from '@angular/core';
import {
  RxHeroDocument
} from './RxDB.d';

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
   * this method exists to play arround with the typings
   */
  foo() {
    // const x: number = this.editedHero.hpPercent();
  }

  editHero(hero: RxHeroDocument) {
    this.editedHero = hero;
  }
}
