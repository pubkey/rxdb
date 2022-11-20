import {
    Selector
} from 'testcafe';
import AsyncTestUtil from 'async-test-util';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions, no-unused-expressions
fixture`Example page`
    .page`http://0.0.0.0:8888/`;


test('insert/edit/remove a hero', async t => {
    // clear previous heroes
    const heroElements = Selector('#heroes-list li');
    const amount = await heroElements.count;

    for (let i = 0; i < amount; i++) {
        await t.click('.delete');
    }

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
    await AsyncTestUtil.wait(200);

    const heroListElement = Selector('#heroes-list li');
    await t.expect(heroListElement.textContent).contains('Kelso', 'list-item contains name');
});
