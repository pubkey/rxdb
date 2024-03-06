
async function run() {

    const state = await myDb.getState();

    await state.set('foobar', 1);
    state.foobar++;
    
    
    state.update('foobar', (prevValue) => prevValue + 1);
    state.foobar$.subscribe();
    const signal = state.foobar$$;

}
