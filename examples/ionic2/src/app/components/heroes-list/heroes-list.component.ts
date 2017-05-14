import {Component, EventEmitter, NgZone, OnDestroy, OnInit, Output} from "@angular/core";
import {RxDocument} from "../../../../../../";

import {DatabaseService} from "../../services/database.service";

@Component({
  selector: 'heroes-list',
  templateUrl: 'heroes-list.component.html'
})
export class HeroesListComponent implements OnInit, OnDestroy {

  heroes: RxDocument[];
  sub;

  @Output('edit') editChange: EventEmitter<RxDocument> = new EventEmitter();

  set edit(hero) {
    console.log('editHero: ' + hero.name);
    this.editChange.emit(hero);
  }

  editHero(hero) {
    this.edit = hero;
  }

  deleteHero(hero) {
    hero.remove();
  }

  constructor(private databaseService: DatabaseService,
              private zone: NgZone) {
  }

  ngAfterContentInit() {
  }


  private async _show() {
    const db = await this.databaseService.get();
    const heroes$ = db['hero']
      .find()
      .sort({name: 1})
      .$;
    this.sub = heroes$.subscribe(heroes => {
      this.heroes = heroes;
      this.zone.run(() => {
      });
    });
  }

  ngOnInit() {
    this._show();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
