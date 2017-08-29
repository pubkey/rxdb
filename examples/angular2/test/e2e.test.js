import {
    Selector
} from 'testcafe';
import AsyncTestUtil from 'async-test-util';

fixture `Example page`
    .page `http://0.0.0.0:8888/`;


test('insert a hero', async t => {
    // input name
    const heroNameInput = Selector('.hero-insert-component input[name=name]');
    await t
        .expect(heroNameInput.value).eql('', 'input is empty')
        .typeText(heroNameInput, 'BobKelso')
        .expect(heroNameInput.value).contains('Kelso', 'input contains name');

    // input color
    const heroColorInput = Selector('.hero-insert-component input[name=color]');
    await t
        .expect(heroColorInput.value).eql('', 'input is empty')
        .typeText(heroColorInput, 'black')
        .expect(heroColorInput.value).contains('black', 'input contains color');

    // submit
    await t.click('.hero-insert-component button');
    await AsyncTestUtil.wait(200);

    const heroListElement = Selector('.hero-list-component .mat-list-item');
    await t.expect(heroListElement.textContent).contains('Kelso', 'list-item contains name');
});

test.page('http://0.0.0.0:8888/multitab.html')('multitab: insert hero and check other tab', async t => {

    await t
        .switchToIframe('#frame_left')
        .typeText('.hero-insert-component input[name=name]', 'SteveIrwin')
        .typeText('.hero-insert-component input[name=color]', 'red')
        .click('.hero-insert-component button');

    await t.switchToMainWindow();

    // check if in other iframe
    await t.switchToIframe('#frame_right');
    const heroListElement = Selector('.hero-list-component .mat-list-item');
    await t.expect(heroListElement.textContent).contains('Irwin', 'list-item contains name');
});
