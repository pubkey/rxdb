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


## 1. August 2018
BEFORE: 15-16ms
{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 10389.790377,
    "perInstance": 10.389790376999999
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 6810.25496,
    "perBlock": 3.40512748
  },
  "findDocuments": {
    "amount": 10000,
    "total": 2407.597088,
    "perDocument": 0.2407597088
  }
}

AFTER: {
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 10247.523947,
    "perInstance": 10.247523947
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 7049.612496,
    "perBlock": 3.524806248
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1931.517909,
    "perDocument": 0.19315179089999998
  }
}


## 2. August 2018
RxDocument-Prototype-Merge

BEFORE: {
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 10247.523947,
    "perInstance": 10.247523947
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 7049.612496,
    "perBlock": 3.524806248
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1931.517909,
    "perDocument": 0.19315179089999998
  }
}

AFTER: {
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 10211.46413,
    "perInstance": 10.21146413
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 6385.01551,
    "perBlock": 3.1925077550000003
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1535.049006,
    "perDocument": 0.1535049006
  }
}

## 4. September 2018
Improve database-creation

BEFORE: {
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 10187.075964,
    "perInstance": 10.187075964
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 5573.09158,
    "perBlock": 2.78654579
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1192.443974,
    "perDocument": 0.11924439740000001
  }
}

AFTER: {
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 9906.039395,
    "perInstance": 9.906039395
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 5781.148116,
    "perBlock": 2.8905740580000003
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1312.261532,
    "perDocument": 0.1312261532
  }
}

## 7. September 2018
Build size:
BEFORE:
103397

AFTER:
102322
102278
102228
102166
102109
102084
102063
102024
102002
101983
101962
101921
