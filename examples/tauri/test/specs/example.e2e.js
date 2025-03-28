describe('Heroes', () => {
  it('should load successfully', async () => {
    const header = await $('body > h1');
    const text = await header.getText();
    expect(text).toEqual('RxDB Heroes Tauri');
  });
  it('should insert a hero', async () => {
    const name = await $('#input-name');
    const color = await $('#input-color');
    const submit = await $('#input-submit');

    await name.setValue('Iron Man');
    await color.setValue('red');
    await submit.click();

    await browser.pause(100);

    const elements = await $$('.name[name="Iron Man"]');
    expect(elements).toHaveLength(1);
  });
});
