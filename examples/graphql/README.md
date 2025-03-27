# RxDB GraphQL example

This is an example usage of RxDB with with the graphql-replication-plugin.
It represents a simple hero-list which is two-way-replicated with the server.

# Try it out
1. clone the whole [RxDB-repo](https://github.com/pubkey/rxdb)
2. go into project `cd rxdb`
3. run `npm install`  (you may need to run `npm install --legacy-peer-deps`)
4. go to this folder `cd examples/graphql`
5. run `npm run preinstall && npm install`
6. run `npm start`
7. Open [http://127.0.0.1:8888/](http://127.0.0.1:8888/) **IMPORTANT: do not use localhost**



You can change the storage and disable sync via url parameter, e.g.: 

- http://localhost:8888/?storage=localstorage&sync=false
