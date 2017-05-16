import {Component, ViewChild} from "@angular/core";
import {DatabaseService} from "../../services/database.service";

@Component({
  selector: 'hero-insert',
  templateUrl: 'hero-insert.component.html'
})
export class HeroInsertComponent {

  @ViewChild('input') inputField;

  name = '';
  color = '';

  constructor(private databaseService: DatabaseService) {
  }

  async submit() {
    console.log('HeroInsertComponent.submit():');
    if (this.name == '' || this.color == '') return;

    const addDoc = {
      name: this.name,
      color: this.color,
      maxHP: Math.floor(Math.random() * 900) + 100,
      hp: 100
    };

    this.name = '';
    this.color = '';

    const db = await this.databaseService.get();
    db['hero'].insert(addDoc);

    //this.inputField.nativeElement.focus();
  }
}
