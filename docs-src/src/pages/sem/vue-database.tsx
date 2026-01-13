import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Vue.js Apps',
            appName: 'Vue.js',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in Vue.js</>,
            text: <>Store data inside of your Vue.js app to build high performance realtime applications that sync data from the backend and even work when offline.</>,
            iconUrl: '/files/icons/vuejs.svg'
        }
    });
}
