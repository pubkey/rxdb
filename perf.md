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


## 15 April 2019
Optimise build-size by doing better imports

BEFORE:
102790

TRY: FUNCTION AS DEFAULT:
102777

TRY: FUNCTION WITHOUT DEFAULT
102777
102776

102728
102714
102683
102697
102684
102629


## 24 April 2019
Remove _regeneratorRuntime

BEFORE: 
102572

AFTER:
102478
102451
102461
102481
102319
102163
102047
102167
101970
101752
101599
101446
101420
101403
101382
101347
98576



## 8 November 2019

BEFORE:

{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 10066.766161,
    "perInstance": 10.066766161
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 5963.456396,
    "perBlock": 2.981728198
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1808.460181,
    "perDocument": 0.1808460181
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 4475.968576
  }
}

AFTER CUSTOM BUILD:

{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 9502.918219,
    "perInstance": 9.502918219
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 5624.821419,
    "perBlock": 2.8124107095
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1742.657245,
    "perDocument": 0.1742657245
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 4957.095949
  }
}

## Add while subscribe test

{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 10052.490876,
    "perInstance": 10.052490876
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 5526.700043,
    "perBlock": 2.7633500215
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1794.911805,
    "perDocument": 0.17949118049999999
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 5134.875101
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 12426.62809
  }
}

## use: array-push-at-sort-position

Combined best of many runs

{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 9604.652948,
    "perInstance": 9.604652948
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 5836.421114,
    "perBlock": 2.918210557
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1432.457661,
    "perDocument": 0.1432457661
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 4115.045391
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 9996.26826
  }
}

## using less deep-clones

Combined best of many runs

{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 9600.227252,
    "perInstance": 9.600227252
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 5319.980171,
    "perBlock": 2.6599900855
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1224.783592,
    "perDocument": 0.1224783592
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 4652.264144
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 10082.873372
  }
}

## better method to remove doc from array

{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 9483.45607,
    "perInstance": 9.48345607
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 5400.620172,
    "perBlock": 2.700310086
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1386.384774,
    "perDocument": 0.13863847740000002
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 3769.25471
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 12508.054624
  }
}



## Before event-reduce-js

BEFORE:

{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 10472.781867,
    "perInstance": 10.472781867
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 7473.578767,
    "perBlock": 3.7367893835
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1501.103103,
    "perDocument": 0.1501103103
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 3294.598218
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 10447.864809
  }
}


{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 10913.7235,
    "perInstance": 10.9137235
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 7503.363727,
    "perBlock": 3.7516818635
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1999.911211,
    "perDocument": 0.1999911211
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 3329.153105
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 10567.352254
  }
}

AFTER:

{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 13084.705562,
    "perInstance": 13.084705562
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 8999.905236,
    "perBlock": 4.499952618
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1645.998414,
    "perDocument": 0.1645998414
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 4212.80011
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 9041.238585
  }
}

{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 12290.284759,
    "perInstance": 12.290284759
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 10075.885535,
    "perBlock": 5.0379427675
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1613.295623,
    "perDocument": 0.1613295623
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 4003.478441
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 8911.231049
  }
}



## optimize event-reduce for performance

(measure writeWhileSubscribe)

BEFORE:
5862
5672
5702
5601
5586
avg = 5684.6

AFTER:
5405
5455
5500
5480
5451
avg = 5458.2



## use addCollections

BEFORE:

  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 17758.374207,
    "perInstance": 17.758374207
  }
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 17622.248933,
    "perInstance": 17.622248932999998
  },

