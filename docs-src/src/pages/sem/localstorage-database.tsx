import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The best Database on top of localstorage',
            appName: 'Browser',
            title: <>The best <b className="underline">Database</b> on top of{' '}
                <b className="underline">localstorage</b></>,
            text: <>Store data inside the Browsers localstorage to build high performance realtime applications that sync data from the backend and even work when offline.</>
        }
    });
}
