# performance notes for version 8.0.0


## BEFORE 7.7.0

npm run disc:   555.5 kB

npm run test:performance:
{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 11338.681851,
    "perInstance": 11.338681850999999
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 10253.78213,
    "perBlock": 5.126891065
  },
  "findDocuments": {
    "amount": 10000,
    "total": 4717.342368,
    "perDocument": 0.4717342368
  }
}

npm run test:fast
26 seconds



## After switching to pouchdb 7.0.0

npm run disc: 555.1 kB

npm run test:performance:
{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 8666.891654,
    "perInstance": 8.666891653999999
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 7554.68064,
    "perBlock": 3.77734032
  },
  "findDocuments": {
    "amount": 10000,
    "total": 3394.547271,
    "perDocument": 0.33945472709999996
  }
}

npm run test:fast
17 seconds




## 24. July 2018
npm run build:size
BEFORE:               111701



112383
