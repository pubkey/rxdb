import { Selector } from 'testcafe';

export default class IndexPage {
    constructor () {
        const counterWrapper = Selector('.counter-wrapper');

        this.counter   = counterWrapper.child('.counter');
        this.increment = counterWrapper.child('button').withText('Increment');
        this.desrement = counterWrapper.child('button').withText('Decrement');
    }
}
