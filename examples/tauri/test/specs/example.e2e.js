describe('Heroes', () => {
  it('should load successfully', async () => {
    const header = await $('body > h1');
    const text = await header.getText();
    expect(text).toEqual('RxDB Heroes Tauri');
  });
  it('should insert a hero', async () => {
    // wait until the database is created and window.addHero() exists
    const dbReady = await $('body[data-db-ready="true"]');
    await dbReady.waitForExist({ timeout: 60000 });

    const name = await $('#input-name');
    const color = await $('#input-color');
    const submit = await $('#input-submit');

    await name.setValue('Iron Man');
    await color.setValue('red');
    await submit.click();

    const insertedHero = await $('.name[name="Iron Man"]');
    await insertedHero.waitForExist({ timeout: 20000 });

    const elements = await $$('.name[name="Iron Man"]');
    expect(elements).toHaveLength(1);
  });
});
