const { Index, Document, Worker } = require("flexsearch");


async function run() {
    const index = new Index();
    index.add('a', 'foo car');
    index.add('b', 'bar car');
    const bla = index.add('c', 'iar jar');
    index.add('d', 'bar1 car');
    index.add('e', 'bar2 car');
    // new Array(10).fill(0).map((_, idx) => {
    //     index.add('x' + idx, 'bar' + idx);
    // });


    console.log(JSON.stringify({ bla }, null, 4));

    index.export((_, data) => {
        console.log('export:');
        console.dir({
            _,
            data
        });
    });




}
run();
