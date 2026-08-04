import { Selector } from 'testcafe';
import AsyncTestUtil from 'async-test-util';

fixture`Svelte + RxDB Note-taking App Demo`
    .page`http://localhost:5000/`;

test('insert/edit/remove a note', async t => {
    // clear previous notes
    const noteElements = Selector('#note-list li');
    const amount = await noteElements.count;

    for (let i = 0; i < amount; i++) {
        await t.click('.btn-delete');
    }

    // input title
    const noteTitleInput = Selector('input');
    await t
        .expect(noteTitleInput.value).eql('', 'input is empty')
        .typeText(noteTitleInput, 'My Note Title')
        .expect(noteTitleInput.value).contains('My', 'input contains name');

    // input note body
    const noteBodyTextarea = Selector('textarea');
    await t
        .expect(noteBodyTextarea.value).eql('', 'input is empty')
        .typeText(noteBodyTextarea, 'This is the content of the note.')
        .expect(noteBodyTextarea.value).contains('content', 'input contains content');

    // submit
    await t.click('button');
    await AsyncTestUtil.wait(200);

    const noteListElement = Selector('#note-list li');
    await t.expect(noteListElement.textContent).contains('My', 'list-item contains title match');
});

test('edit the body of an existing note', async t => {
    // clear previous notes
    const noteElements = Selector('#note-list li');
    const amount = await noteElements.count;

    for (let i = 0; i < amount; i++) {
        await t.click('.btn-delete');
    }

    const noteTitleInput = Selector('input');
    const noteBodyTextarea = Selector('textarea');

    // insert a note
    await t
        .typeText(noteTitleInput, 'Editable Note')
        .typeText(noteBodyTextarea, 'first version')
        .click(Selector('button').withText('Save Note'));
    await AsyncTestUtil.wait(200);

    // the form must be empty again after the insert
    await t
        .expect(noteTitleInput.value).eql('', 'title input was reset')
        .expect(noteBodyTextarea.value).eql('', 'body input was reset');

    // select the note by clicking on its title
    await t.click(Selector('#note-list li button').withText('Editable Note'));
    await t
        .expect(noteTitleInput.value).eql('Editable Note', 'title is loaded into the form')
        .expect(noteBodyTextarea.value).eql('first version', 'body is loaded into the form');

    // change the body and save
    await t
        .selectText(noteBodyTextarea).pressKey('delete')
        .typeText(noteBodyTextarea, 'second version')
        .click(Selector('button').withText('Save Note'));
    await AsyncTestUtil.wait(200);

    await t
        .expect(noteElements.count).eql(1, 'the note was updated, not inserted again')
        .expect(noteElements.textContent).contains('second version', 'list shows the updated body')
        .expect(noteTitleInput.value).eql('', 'title input was reset after the update');
});
