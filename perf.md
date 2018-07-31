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



## 31. July 2018
Better broadcast-channel and unload
npm run test:fast
BEFORE: 16-17 ms
{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 10836.312383,
    "perInstance": 10.836312383000001
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 7355.86208,
    "perBlock": 3.67793104
  },
  "findDocuments": {
    "amount": 10000,
    "total": 2118.243776,
    "perDocument": 0.21182437759999997
  }
}

AFTER: 15ms
{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 10175.0929,
    "perInstance": 10.1750929
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 6704.211541,
    "perBlock": 3.3521057704999997
  },
  "findDocuments": {
    "amount": 10000,
    "total": 2352.463973,
    "perDocument": 0.2352463973
  }
}
