import { Selector } from 'testcafe';
import AsyncTestUtil from 'async-test-util';

fixture`RxDB Ionic + Capacitor Heroes Example`
    .page('http://localhost:8100/');

test('insert, edit and delete a hero', async t => {
    const heroName = 'BobKelso';

    // wait until the database is created and the list is rendered
    await t.expect(Selector('#hero-list').exists).ok();
    await t.expect(Selector('#no-heroes').exists).ok();

    // insert a hero
    await t
        .typeText(Selector('#insert-name input'), heroName)
        .click('#insert-button');

    const heroItem = Selector('.hero-list-item').withText(heroName);
    await t.expect(heroItem.exists).ok();

    // edit the hero
    await t.click(heroItem.find('.edit-hero'));
    await t.expect(Selector('#edit-submit').exists).ok();
    await t.click('#edit-submit');
    await AsyncTestUtil.wait(200);

    // the hero must still be there after the modal was closed
    await t.expect(Selector('.hero-list-item').withText(heroName).exists).ok();

    // delete the hero
    await t.click(Selector('.hero-list-item').withText(heroName).find('.delete-hero'));
    await t.expect(Selector('#no-heroes').exists).ok();
});
