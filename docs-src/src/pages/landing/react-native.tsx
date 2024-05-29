import Home from '..';

export default function Page() {
    return Home({
        title: <>The local <b className="underline">Database</b> for{' '}
            <b className="underline">React Native</b></>,
        text: <>Store data inside your React Native App to build high performance realtime applications that sync data with the backend and even work when offline.</>
    });
}
