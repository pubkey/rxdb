import {Component, EventEmitter, Input, Output} from "@angular/core";
import {DatabaseService} from "../../services/database.service";
import {RxDocument} from "../../../../../../";

@Component({
  selector: 'hero-edit',
  templateUrl: 'hero-edit.component.html'
})
export class HeroEditComponent {

  @Input('hero') hero: RxDocument;
  @Output('done') done = new EventEmitter();

  constructor(private databaseService: DatabaseService) {
  }

  async submit() {
    await this.hero.save();
    this.done.emit(true);
  }

  async cancel() {
    this.hero.resync();
    this.done.emit(false)
  }

  public convertToNumber(event):number {
    return +event;
  }
}
