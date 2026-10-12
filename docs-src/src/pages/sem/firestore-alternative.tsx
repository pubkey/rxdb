import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The Open Source alternative for Firestore',
            metaDescription: 'RxDB is an open-source, offline-first alternative to Firestore. Data lives on the device, queries run locally and changes sync to the backend you choose.',
            title: <>The <b >Open Source</b> alternative for {' '}
                <b >Firestore</b></>
        }
    });
}
