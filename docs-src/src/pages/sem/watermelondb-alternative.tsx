import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The NoSQL alternative for WatermelonDB',
            title: <>The <b className="underline">NoSQL</b> alternative for{' '}
                <b className="underline">WatermelonDB</b></>
        }
    });
}
