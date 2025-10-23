import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'reddit',
            metaTitle: 'The local Database for Angular Apps',
            appName: 'Angular',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data</>
        }
    });
}
