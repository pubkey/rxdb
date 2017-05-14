import {Component} from "@angular/core";
import {RxDocument} from "rxdb";

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  editedHero: RxDocument;

  constructor() {
  }

  editHero(hero) {
    this.editedHero = hero;
  }
}
