import {
    Selector
} from 'testcafe';
import AsyncTestUtil from 'async-test-util';

fixture `Example page`
    .page `http://0.0.0.0:8080/`;


test('insert/edit/remove a hero', async t => {
    // input name
    const heroNameInput = Selector('#insert-box input[name=name]');
    await t
        .expect(heroNameInput.value).eql('', 'input is empty')
        .typeText(heroNameInput, 'BobKelso')
        .expect(heroNameInput.value).contains('Kelso', 'input contains name');

    // input color
    const heroColorInput = Selector('#insert-box input[name=color]');
    await t
        .expect(heroColorInput.value).eql('', 'input is empty')
        .typeText(heroColorInput, 'black')
        .expect(heroColorInput.value).contains('black', 'input contains color');

    // submit
    await t.click('#insert-box button');
    await AsyncTestUtil.wait(300);

    const heroListElement = Selector('#list-box .hero-name');
    await t.expect(heroListElement.textContent).contains('Kelso', 'list-item contains name');

    // remove again
    await t.click('.actions .fa-trash-o');
    await AsyncTestUtil.wait(200);
    await t.expect(Selector('#list-box .hero-name').count).eql(0);
});
