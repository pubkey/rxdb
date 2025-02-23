import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'firestore-alternative',
            metaTitle: 'The Open Source alternative for Firestore',
            title: <>The <b className="underline">Open Source</b> alternative for {' '}
                <b className="underline">Firestore</b></>
        }
    });
}
