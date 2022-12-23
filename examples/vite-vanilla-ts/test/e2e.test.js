import { Selector } from 'testcafe';
import AsyncTestUtil from 'async-test-util';

fixture`Vite + RxDB + Typescript Heroes App Demo`
    .page('http://localhost:4173/');

test('insert a note', async t => {
    // input name
    const heroNameInput = Selector('#heroName');
    await t
        .expect(heroNameInput.value).eql('', 'input is empty')
        .typeText(heroNameInput, 'Superman')
        .expect(heroNameInput.value).contains('Superman', 'input contains name');

    // input hero color
    const heroColorInput = Selector('#heroColor');
    await t
        .expect(heroColorInput.value).eql('#000000', 'input is empty')
        .typeText(heroColorInput, '#e6008d')
        .expect(heroColorInput.value).contains('#e6008d', 'input contains content');

    // submit
    await t.click('#btnSave');
    await AsyncTestUtil.wait(200);

    const noteListElement = Selector('#heroList li');
    await t.expect(noteListElement.textContent).contains('Superman', 'list-item contains name match');
});
