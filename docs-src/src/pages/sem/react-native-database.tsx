import Home from '..';

export default function Page() {
    return Home({
        metaTitle: 'The local Database for React Native',
        title: <>The local <b className="underline">Database</b> for{' '}
            <b className="underline">React Native</b></>,
        text: <>Store data inside your React Native App to build high performance realtime applications that sync data from React-Native to the backend and even work when offline.</>
    });
}
