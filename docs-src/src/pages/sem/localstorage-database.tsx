import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The best Database on top of localstorage',
            appName: 'Browser',
            title: <>The easiest way to <b className="underline">store</b> and <b className="underline">sync</b> Data in LocalStorage</>,
            text: <>Store data inside the Browsers localstorage to build high performance realtime applications that sync data from the backend and even work when offline.</>
        }
    });
}
