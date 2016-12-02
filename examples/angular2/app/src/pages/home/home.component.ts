import {Component} from '@angular/core';

@Component({
    templateUrl: './home.component.html',
    styles: [String(require('./home.component.less'))],
})
export class HomeComponent {
    constructor() { }
    ngOnInit() { }
}
