import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The Open Source alternative for Firestore',
            title: <>The <b >Open Source</b> alternative for {' '}
                <b >Firestore</b></>
        }
    });
}
