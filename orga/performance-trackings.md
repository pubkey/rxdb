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



## refactor migration plugin

BEFORE:

  "migrateDocuments": {
    "amount": 1000,
    "total": 10218.362063
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 10408.40937
  },

AFTER STEP 1:

  "migrateDocuments": {
    "amount": 1000,
    "total": 8282.815032
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 7828.624684
  },


## improve subscribe emit time with lokijs

BEFORE:

{
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 0,
    "perInstance": 0
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 8082.367692,
    "perBlock": 4.041183846
  },
  "findDocuments": {
    "amount": 10000,
    "total": 0,
    "perDocument": 0
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 1079.906038
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 2464.082083
  }
}




###

{
  "storage": "lokijs",
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 7484.257725,
    "perInstance": 7.484257725
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 7210.454849,
    "perBlock": 3.6052274244999998
  },
  "findDocuments": {
    "amount": 10000,
    "total": 362.96669,
    "perDocument": 0.036296669000000004
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 1187.796861
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 2744.249165
  }
}




WITH native async/await:

{
  "storage": "lokijs",
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 6119.575432,
    "perInstance": 6.1195754319999995
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 5759.660255,
    "perBlock": 2.8798301275
  },
  "findDocuments": {
    "amount": 10000,
    "total": 489.215873,
    "perDocument": 0.0489215873
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 3275.723683
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 2716.470968
  }
}

WITH async/await transpiled to generator:

{
  "storage": "lokijs",
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 6116.762565,
    "perInstance": 6.116762565
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 5766.097302,
    "perBlock": 2.883048651
  },
  "findDocuments": {
    "amount": 10000,
    "total": 502.527308,
    "perDocument": 0.0502527308
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 3268.853656
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 2769.797263
  }
}




## transpile async/await to promises instead of generators
https://www.npmjs.com/package/babel-plugin-transform-async-to-promises

> npm run build:size

BEFORE:

core:
Build-Size (minified+gzip):
75489

AFTER:

core: 
Build-Size (minified+gzip):
70723



Without externalHelpers: 70732
With externalHelpers: 




## 28.02.2022

BEFORE: 
{
  "storage": "pouchdb",
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 29323.446457,
    "perInstance": 29.323446457
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 7082.087827,
    "perBlock": 3.5410439135000003
  },
  "findDocuments": {
    "amount": 10000,
    "total": 2235.385865,
    "perDocument": 0.22353858650000002
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 3841.661595
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 2821.622409
  }
}

AFTER:

{
  "storage": "pouchdb",
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 17822.879896,
    "perInstance": 17.822879896
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 4327.567031,
    "perBlock": 2.1637835154999996
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1483.613512,
    "perDocument": 0.1483613512
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 2639.312311
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 1738.548941
  }
}


## 05.03.2022

{
  "storage": "pouchdb",
  "spawnDatabases": {
    "amount": 1000,
    "collections": 5,
    "total": 18651.573212,
    "perInstance": 18.651573212
  },
  "insertDocuments": {
    "blocks": 2000,
    "blockSize": 5,
    "total": 6650.861714,
    "perBlock": 3.3254308569999997
  },
  "findDocuments": {
    "amount": 10000,
    "total": 1156.847967,
    "perDocument": 0.1156847967
  },
  "migrateDocuments": {
    "amount": 1000,
    "total": 1833.045903
  },
  "writeWhileSubscribe": {
    "amount": 1000,
    "total": 2059.198253
  }
}


## 25. July 2022
Do not use md5 as default hashing method.

BEFORE:

{
    "description": "memory",
    "time-to-first-insert": 11.17971400047342,
    "insert-documents": 44.939861000825964,
    "find-by-ids": 0.0864659994840622,
    "find-by-query": 1.9507423328856628
}


AFTER:

{
    "description": "memory",
    "time-to-first-insert": 4.654121999939282,
    "insert-documents": 36.99423733229438,
    "find-by-ids": 0.11590833341081937,
    "find-by-query": 2.83842833340168
}


## 23 September 2022

Optimize memory storage inserts

BEFORE:

{
    "description": "memory",
    "platform": "node",
    "time-to-first-insert": 4.579850833339151,
    "insert-documents": 63.33092266668488,
    "find-by-ids": 0.14936283333615089,
    "find-by-query": 2.2706114999988736
}

AFTER:

{
    "description": "memory",
    "platform": "node",
    "time-to-first-insert": 6.710264333290979,
    "insert-documents": 28.996477166734014,
    "find-by-ids": 0.21324566666347286,
    "find-by-query": 2.148450500021378
}







## 30 October 2022

test:performance:memory:node

BEFORE:

{
    "description": "memory",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 600,
    "time-to-first-insert": 3.745738666659842,
    "insert-documents": 26.05025925001246,
    "find-by-ids": 0.36593841669188504,
    "find-by-query": 4.35889441667435
}

AFTER:

{
    "description": "memory",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 600,
    "time-to-first-insert": 3.2232383333321195,
    "insert-documents": 23.658734166664846,
    "find-by-ids": 0.3708604166846878,
    "find-by-query": 1.4871898333367426
}


## 10 January 2023

Improve IndexedDB performance.

### Bulk Get By ID
Before: 'performanceResult: 8.710000000614674
Mid: 6.327500000409782
After: 5.875000000093133

B::
7.410000000335276
6.192500000540167
6.100000000279397
6.26750000026077

A::
6.125000000558794
5.967500000726432
6.00750000057742
5.867500000167638

A2::
5.962500000279396
6.055000000633299
5.9225000005215405'
5.872500000149012
5.827500000130385

A3::
5.595000000670552
5.689999999850988'

A4::
4.919999998435378 <-- WTF!

### Query
Before: 'performanceResult: 6.247500000195577
After:  'performanceResult: 6.067500000400469

### Bulk Insert
Before: 'performanceResult: 34.99750000052154
Mid:  'performanceResult: 33.30000000083819




### getIndexName

Before:
2.7850000001490116'
2.7349999994039536
2.7700000002980234'

After:
2.6700000006705524
2.5700000006705523


## Bulk Insert again

Before:
72.89250000016764
70.52500000009313
69.82500000065193

After:
69.5450000004843'
68.21000000070781'


# 12 January 2023
Goal: Improve document insert performance

BEFORE:
74.85
74.47
73.99

A1:
73.24
74.44
73.83
74.22
73.66

A2:
72.52
72.16


# 13 January 2023
Goal: Improve indexeddb find by id

Before:
53.45
53.05
54.12000000011176

A1: (use nested row instead of attaching indexes to document data)
52.269999999832365
50.759999999962744

A2: (rxdb core update)
50.48999999994412
51.420000000111756


# 13 January 2023
Goal: Improve indexeddb insert performance

BEFORE:
62.90000000018627
61.62999999979511


A1: (always use .put instead of .add)
60.14999999990687
60.24999999990687

A2: (shorter index names)
59.07000000011176
59.05000000037253


# 14 January 2024
Goal: Improve sharding performance

## Get shard index

Before:
93.37000000029802
93.39999999850988

After:
93.15000000149011
92.71000000238419

## BulkWrite

Before:
61.17999999821186
61.3

A1:
59.35999999940395
60.05
57.920000000298025

## find by id
Before:
7.060000000894069
7.129999996721745
6.969999997317791

After:
4.509999997913837
4.589999994635582

## query
Before:
111.52000000029803
114.04000000059605
108.9300000011921

A1:: (use sorted-array-merge)
52.52000000178814
54


## improve default sortComparator
Before:
2660
2651
2654

A1: Reuse query object
2506.91745699942

A2: Rewrite to own sort function
146.54432300
140.800432999



## 7 March 2023 - Improve sqlite performance

### Query in serial:

BEFORE:
30.1



## 4 April 2023 - improve OPFS storage performance 

#### (time-to-first-insert)

BEFORE:
performanceResult: 54.26


LOG LOG: 'performanceResult: 52.08'


AFTER:
'performanceResult: 13.66'


#### find-by-id

BEFORE:

'performanceResult: 34.82'
'performanceResult: 35.26'

AFTER:

'performanceResult: 20.15'
'performanceResult: 20.65'

AFTER2:
19.03
18.9

AFTER3:
performanceResult: 12.59
performanceResult: 12.78

AFTERR4:
performanceResult: 12.87

AFTER5:
15.15
18.47
13.31

AFTER6: (Send JSON-string via postMessage to changelog$)

12.47
12.37

AFTER7 (return concated JSON-string instead of complex object):
7.13
7



### insert documents

FIXED TEST!!

BEFORE:
performanceResult: 87.94'

AFTER:
performanceResult: 83.39



AFTER 3:
40.8
44.3
37.9
38.7

AFTER 4:
41.8
39.2

### Query

BEFORE:
'performanceResult: 11.38'
'performanceResult: 11.17'

AFTER:
performanceResult: 10.91
'performanceResult: 10.38'

AFTER2:
10.25
10.44

AFTER(return json string)
6.08
5.77

### init storage

BEFORE:
performanceResult: 16.97

AFTER:
performanceResult: 15.95
performanceResult: 15.77

AFTER2:
performanceResult: 14.7
performanceResult: 13.83

AFTER3:
performanceResult: 12.86
performanceResult: 12.33




### array-push-at-sort-position

#### reuse length variable

BEFORE:
2.817362993955612ms
2.7930039912462234ms
2.702904000878334ms

AFTER (reuse length variable):
2.5128260105848312ms
2.5788690000772476ms


#### set low-value
BEFORE:
time for "merge sorted arrays": 872.4071319997311ms
compareCounts: 1431962




AFTER (using custom low index):
time for "merge sorted arrays": 847.3687120079994ms
compareCounts: 1261729


## Improve getIndexableStringMonad()()

BEFORE:
91.24348497390747
86.09021002054214
89.61336600780487
87.5959959924221
87.1041649878025


AFTER (fix getNumberIndexString()):
76.63579297065735
63.062547981739044
80.47493699193001

AFTER(fix iteration)
70.70821499824524
70.67861998081207
71.3054929971695

AFTER(use inner monad)
64.17834001779556
72.26790100336075
69.85145297646523



## categorizeBulkWriteRows()

BEFORE:
31.00946400000248
35
43
35


AFTER1: (faster event keys)
29.86
31.29
32
31




## bulkWrite() return arrays instead of indexed-objects
24 september 2023
> npm run test:performance:memory:node

BEFORE:
{
    "description": "memory",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.42,
    "insert-documents-200": 3.22,
    "find-by-ids": 0.3,
    "find-by-query": 2.05,
    "find-by-query-parallel-4": 2.26,
    "count": 0.33
}
{
    "description": "memory",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.44,
    "insert-documents-200": 3.14,
    "find-by-ids": 0.27,
    "find-by-query": 2,
    "find-by-query-parallel-4": 2.23,
    "count": 0.29
}
{
    "description": "memory",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.41,
    "insert-documents-200": 3.17,
    "find-by-ids": 0.31,
    "find-by-query": 2.08,
    "find-by-query-parallel-4": 2.32,
    "count": 0.34
}



AFTER:
{
    "description": "memory",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.36,
    "insert-documents-200": 2.77,
    "find-by-ids": 0.86,
    "find-by-query": 1.91,
    "find-by-query-parallel-4": 2.12,
    "count": 0.28
}
{
    "description": "memory",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.4,
    "insert-documents-200": 2.8,
    "find-by-ids": 0.85,
    "find-by-query": 2.01,
    "find-by-query-parallel-4": 2.23,
    "count": 0.29
}

AFTER2: (lazy writes)

{
    "description": "memory",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.53,
    "insert-documents-200": 0.97,
    "find-by-ids": 0.95,
    "find-by-query": 2.05,
    "find-by-query-parallel-4": 2.39,
    "count": 0.35
}
{
    "description": "memory",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.49,
    "insert-documents-200": 1.11,
    "find-by-ids": 0.13,
    "find-by-query": 2.09,
    "find-by-query-parallel-4": 2.51,
    "count": 0.42
}


{
    "description": "memory",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 2.04,
    "insert-documents-200": 1.85,
    "find-by-ids": 0.24,
    "find-by-query": 4.44,
    "find-by-query-parallel-4": 4.29,
    "count": 0.44
}
{
    "description": "memory",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 2.71,
    "insert-documents-200": 1.53,
    "find-by-ids": 0.14,
    "find-by-query": 2.73,
    "find-by-query-parallel-4": 2.74,
    "count": 0.72
}


## Improve property access time (04 October 2023)

> npm run test:performance:memory:node

BEFORE:
"property-access": 6.97
"property-access": 7.21

AFTER:
"property-access": 4.71
"property-access": 5.14
"property-access": 5.07
"property-access": 4.56




## Deno vs Node
tested the memory storage

deno:
{
    "description": "memory",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.4,
    "insert-documents-200": 0.92,
    "find-by-ids": 0.11,
    "find-by-query": 1.97,
    "find-by-query-parallel-4": 2.36,
    "count": 0.34,
    "property-access": 4.89
}
{
    "description": "memory",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.93,
    "insert-documents-200": 0.96,
    "find-by-ids": 0.13,
    "find-by-query": 2.05,
    "find-by-query-parallel-4": 2.5,
    "count": 0.43,
    "property-access": 5.72
}


Node:
{
    "description": "memory",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.55,
    "insert-documents-200": 0.95,
    "find-by-ids": 0.13,
    "find-by-query": 2,
    "find-by-query-parallel-4": 2.36,
    "count": 0.37,
    "property-access": 4.8
}
{
    "description": "memory",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.49,
    "insert-documents-200": 0.95,
    "find-by-ids": 0.14,
    "find-by-query": 2.4,
    "find-by-query-parallel-4": 2.4,
    "count": 0.36,
    "property-access": 6.01
}


## indexeddb 
08.11.2023

BEFORE:
16.07
16.36
15.97
15.45

AFTER:





--- memory query
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX START 5273.516776999459
__ensureEqual 1 5273.764967000112
__ensureEqual 2 5273.826345998794
__ensureEqual 3 5273.86046099849
query collection 5273.905810998753
getprepared query 1 5273.937525998801
getprepared query 2 5273.996019998565
getprepared query 3 5274.101761000231
query collection -> query storage 5274.139894999564
--------------------------
{
    "query": {
        "selector": {},
        "sort": [
            {
                "var2": "asc"
            },
            {
                "var1": "asc"
            },
            {
                "id": "asc"
            }
        ],
        "skip": 0
    },
    "queryPlan": {
        "index": [
            "var2",
            "var1",
            "id"
        ],
        "startKeys": [
            5e-324,
            5e-324,
            5e-324
        ],
        "endKeys": [
            "￿",
            "￿",
            "￿"
        ],
        "inclusiveEnd": true,
        "inclusiveStart": true,
        "sortFieldsSameAsIndexFields": true,
        "selectorSatisfiedByIndex": true
    }
}
0 - 5274.287611998618
1 - 5274.379308998585
2 - 5274.433486999944
3 - 5274.472461000085
4 - 5274.764843000099
5 - 5274.79949099943
6 - 5274.832651998848
__ensureEqual 3.5 5274.88329000026
__ensureEqual 3.51 5274.914865000173
__ensureEqual 3.52 5274.944271000102
_setResultData 1 - 5274.9826020002365
_setResultData 2 - 5275.014417998493
_setResultData 3 - 5276.716801999137
_setResultData 4 - 5277.9068539999425
__ensureEqual 3.53 5277.988210000098
__ensureEqual 3.6 5278.026985999197
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX END 5278.41909699887



## indexeddb parallel queries

BEFORE:
57.83
55.93
55.3


AFTER (reuse readonly transactions):
44.17

## indexeddb single query

BEFORE:
31.81
31.63

AFTER (pre-trigger tx creation):
30.55


## idb other improvements

BEFORE:
{
    "description": "",
    "platform": "indexeddb",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 25.53,
    "insert-documents-200": 7.5,
    "find-by-ids": 47.77,
    "find-by-query": 52.1,
    "find-by-query-parallel-4": 38.3,
    "count": 5.48,
    "property-access": 5.27
}
{
    "description": "",
    "platform": "indexeddb",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 25,
    "insert-documents-200": 7.51,
    "find-by-ids": 48.22,
    "find-by-query": 51.7,
    "find-by-query-parallel-4": 38.6,
    "count": 5.33,
    "property-access": 5.17
}


AFTER: (index option multiEntry=false)

{
    "description": "",
    "platform": "indexeddb",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 26.47,
    "insert-documents-200": 7.4,
    "find-by-ids": 44.58,
    "find-by-query": 50.4,
    "find-by-query-parallel-4": 39,
    "count": 5.57,
    "property-access": 5.3
}
{
    "description": "",
    "platform": "indexeddb",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 24.93,
    "insert-documents-200": 7.6,
    "find-by-ids": 45.4,
    "find-by-query": 49.3,
    "find-by-query-parallel-4": 38.23,
    "count": 5.35,
    "property-access": 5.2
}


AFTER: fix wal cleanup promiseWait()
"time-to-first-insert": 23.75


BEFORE TX REUSED ON WRITES:
"time-to-first-insert": 23.55

LOG LOG: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX START 11813.5'
LOG LOG: 'ON UPDATE NEEDED test-db-performance-swhqajxkzi'
LOG LOG: 'bulk write START internal-add-storage-token | 11826.40000000596'
LOG LOG: 'storage-token|storageToken'
LOG LOG: '# CREATE TX _rxdb_internal'
LOG LOG: 'VVV ADD COLLECTIONS 11827.59999999404'
LOG LOG: 'bulk write START rx-database-add-collection | 11829.5'
LOG LOG: 'collection|sgphpgdqib_0-0, collection|anaymauczp_1-0, collection|fdrkxvqgbj_2-0, collection|pmoyfsfzeo_3-0'
LOG LOG: '# CREATE TX _rxdb_internal'
LOG LOG: 'bulk write DONE internal-add-storage-token | 11832.09999999404'
LOG LOG: 'bulk write DONE rx-database-add-collection | 11837.09999999404'
LOG LOG: 'ON UPDATE NEEDED test-db-performance-swhqajxkzi'
LOG LOG: 'VVV START FIRST INSERT 11868.5'
LOG LOG: 'bulk write START rx-collection-bulk-insert | 11869.09999999404'
LOG LOG: 'kfigwywaxwil'
LOG LOG: '# CREATE TX sgphpgdqib_0'
LOG LOG: 'bulk write DONE rx-collection-bulk-insert | 11872.300000011921'
LOG LOG: 'VVV END FIRST INSERT 11873.200000017881'
LOG LOG: '- CLEANUP WAL ON IDLE!'
LOG LOG: '# CREATE TX _rxdb_internal'
LOG LOG: '# CREATE TX _rxdb_internal'
LOG LOG: '# CREATE TX _rxdb_internal'
LOG LOG: '# CREATE TX anaymauczp_1'
LOG LOG: '# CREATE TX fdrkxvqgbj_2'
LOG LOG: '# CREATE TX pmoyfsfzeo_3'
LOG LOG: '# CREATE TX sgphpgdqib_0'
LOG LOG: '# CREATE TX _rxdb_internal'
LOG LOG: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX DONE 11988.700000017881'



## IndexedDB split wal data

BEFORE:
{
    "description": "",
    "platform": "indexeddb",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1018.05,
    "insert-documents-1200": 31.95
}

AFTER (batchSize 20):
{
    "description": "",
    "platform": "indexeddb",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1024.8,
    "insert-documents-1200": 33.55
}

AFTER (batchSize 50):
{
    "description": "",
    "platform": "indexeddb",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1025.8,
    "insert-documents-1200": 28.85
}

AFTER (batchSize 100):
{
    "description": "",
    "platform": "indexeddb",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1019.8,
    "insert-documents-1200": 29.15
}'

AFTER (batchSize 500):
'{
    "description": "",
    "platform": "indexeddb",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1019,
    "insert-documents-1200": 34.95
}'

AFTER (batchSize 1000):
{
    "description": "",
    "platform": "indexeddb",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1020,
    "insert-documents-1200": 32.3
}'



## key-compression improvements (feb 2024)

BEFORE:

{
  "notice": "times are in milliseconds",
  "createCompressionTable": {
    "amount": 10000,
    "total": 87.29935099929571,
    "perInstance": 0.008729935099929571
  },
  "compress": {
    "amount": 10000,
    "total": 87.45416999980807,
    "perObject": 0.008745416999980807
  },
  "decompress": {
    "amount": 10000,
    "total": 121.86422900017351,
    "perObject": 0.012186422900017351
  }
}


AFTER:

{
  "notice": "times are in milliseconds",
  "createCompressionTable": {
    "amount": 10000,
    "total": 89.79377999994904,
    "perInstance": 0.008979377999994903
  },
  "compress": {
    "amount": 10000,
    "total": 81.2287579998374,
    "perObject": 0.00812287579998374
  },
  "decompress": {
    "amount": 10000,
    "total": 118.99220599979162,
    "perObject": 0.011899220599979162
  }
}


## OPFS in main thread

### WRITES:
worker thread:
performanceResult: 43.77

main thread:
performanceResult: 13.9


## find by id

worker thread:
performanceResult: 44.93

main thread:
performanceResult: 828.3
performanceResult: 490.1
performanceResult: 118.07
performanceResult: 85
performanceResult: 66.57
performanceResult: 38.4
performanceResult: 29.67

## Query
worker thread:
performanceResult: 111.3

main thread:


## Faster opfs writes

BEFORE:
13.6
13.97

AFTER:
12.7
12.63
11.97


## 4 May 2024 improve memory insert-many performance

BEFORE:
{
    "description": "memory",
    "platform": "memory",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.38,
    "insert-documents-200": 0.63,
    "find-by-ids": 0.12,
    "find-by-query": 1.35,
    "find-by-query-parallel-4": 2.32,
    "count": 0.78,
    "property-access": 3.65
}
{
    "description": "memory",
    "platform": "memory",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.3,
    "insert-documents-200": 0.68,
    "find-by-ids": 0.12,
    "find-by-query": 1.47,
    "find-by-query-parallel-4": 2.18,
    "count": 0.78,
    "property-access": 4.85
}


AFTER:
{
    "description": "memory",
    "platform": "memory",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.41,
    "insert-documents-200": 0.51,
    "find-by-ids": 0.1,
    "find-by-query": 1.28,
    "find-by-query-parallel-4": 2.24,
    "count": 0.64,
    "property-access": 3.58
}
{
    "description": "memory",
    "platform": "memory",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.58,
    "insert-documents-200": 0.47,
    "find-by-ids": 0.09,
    "find-by-query": 1.34,
    "find-by-query-parallel-4": 2.16,
    "count": 0.71,
    "property-access": 3.69
}

AFTER (optimize getCachedRxDocumentMonad()):

{
    "description": "memory",
    "platform": "memory",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.09,
    "insert-documents-200": 0.37,
    "find-by-ids": 0.09,
    "find-by-query": 1.47,
    "find-by-query-parallel-4": 2.05,
    "count": 0.55,
    "property-access": 3.51
}
{
    "description": "memory",
    "platform": "memory",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 1.39,
    "insert-documents-200": 0.33,
    "find-by-ids": 0.11,
    "find-by-query": 1.24,
    "find-by-query-parallel-4": 1.98,
    "count": 0.51,
    "property-access": 4.58
}
{
    "description": "memory",
    "platform": "memory",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 0.87,
    "insert-documents-200": 0.31,
    "find-by-ids": 0.1,
    "find-by-query": 0.86,
    "find-by-query-parallel-4": 1.28,
    "count": 0.5,
    "property-access": 2.47
}
{
    "description": "memory",
    "platform": "memory",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 0.92,
    "insert-documents-200": 0.38,
    "find-by-ids": 0.11,
    "find-by-query": 1.07,
    "find-by-query-parallel-4": 1.43,
    "count": 0.59,
    "property-access": 2.35
}
{
    "description": "memory",
    "platform": "memory",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 0.84,
    "insert-documents-200": 0.34,
    "find-by-ids": 0.07,
    "find-by-query": 0.98,
    "find-by-query-parallel-4": 1.54,
    "count": 0.55,
    "property-access": 2.57
}


## Faster indexeddb inserts (15 May 2024)

BEFORE:

{
    "description": "",
    "platform": "indexeddb",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 22.85,
    "insert-documents-200": 2.63,
    "find-by-ids": 13.55,
    "find-by-query": 12.55,
    "find-by-query-parallel-4": 9.4,
    "count": 2.8,
    "property-access": 2.05
}

AFTER:
{
    "description": "",
    "platform": "indexeddb",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 23.6,
    "insert-documents-200": 2.33,
    "find-by-ids": 13.8,
    "find-by-query": 14.2,
    "find-by-query-parallel-4": 10.85,
    "count": 2.75,
    "property-access": 2.65
}'
{
    "description": "",
    "platform": "indexeddb",
    "collectionsAmount": 4,
    "docsAmount": 1200,
    "time-to-first-insert": 22.65,
    "insert-documents-200": 2.17,
    "find-by-ids": 13.35,
    "find-by-query": 12.55,
    "find-by-query-parallel-4": 10.25,
    "count": 2.95,
    "property-access": 2.4
}




## 1 July 2024 : Improve sharding in-memory performance

Insert 200k documents

BEFORE:
59
57
57
54

AFTER:
10
8
10


## 2 July 2024 : Memory Cleanup Speed

BEFORE:
"insert-documents-1200": 6.71
"insert-documents-1200": 7.3,
"insert-documents-1200": 7.06,
"insert-documents-1200": 6.43,


AFTER: (use array as item instead of object)
"insert-documents-1200": 7.12
insert-documents-1200": 7.18
"insert-documents-1200": 6.45
"insert-documents-1200": 6.33
"insert-documents-1200": 6.44
"insert-documents-1200": 6.28

## 6 July 2024 : Insert many to memory storage
Insert 50000 docs at once to an empty database.

BEFORE:
"insert-documents-50000": 122.65
"insert-documents-50000": 121.41

AFTER: (processing change-event-buffer events in bulks)
"insert-documents-50000": 111.91
"insert-documents-50000": 112.28

AFTER: (DocCache processing events in bulks)
"insert-documents-50000": 106.87
"insert-documents-50000": 109.35

AFTER: (lazy processing change-event-buffer tasks)
"insert-documents-50000": 103.24
"insert-documents-50000": 105.59

AFTER: (lazy processing doc-cache tasks):
"insert-documents-50000": 102.15
"insert-documents-50000": 100.35

AFTER: (lazy data-to-RxDocument transformation):
"insert-documents-50000": 42.21
"insert-documents-50000": 37.32
"insert-documents-50000": 42.39


## 9 December 2020 SQLite serial inserts

BEFORE:
"serial-inserts-200": 4005.75,

AFTER (await sqliteBasics.setPragma(db, 'synchronous', 'normal');):
"serial-inserts-200": 2815.81
"serial-inserts-200": 2821.52
"serial-inserts-200": 2753.91

AFTER (using non-tx for small inserts)



{
    "description": "sqlite node",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 3000,
    "time-to-first-insert": 27.75,
    "insert-documents-500": 7.98,
    "find-by-ids-3000": 19.21,
    "serial-inserts-200": 49.06,
    "serial-find-by-id-200": 1.02,
    "find-by-query": 16.66
}
{
    "description": "sqlite node",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 3000,
    "time-to-first-insert": 26.41,
    "insert-documents-500": 8.4,
    "find-by-ids-3000": 21.81,
    "serial-inserts-200": 45.58,
    "serial-find-by-id-200": 0.93,
    "find-by-query": 17.91
}













LOG LOG: '{
    "description": "sqlite node",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 3000,
    "time-to-first-insert": 5.4,
    "insert-documents-500": 24.38,
    "find-by-ids-3000": 52.5,
    "serial-inserts-200": 118.8,
    "serial-find-by-id-200": 4.05,
    "find-by-query": 37.35
}'

LOG LOG: '{
    "description": "sqlite node",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 3000,
    "time-to-first-insert": 4.7,
    "insert-documents-500": 26.18,
    "find-by-ids-3000": 52.85,
    "serial-inserts-200": 82.85,
    "serial-find-by-id-200": 4,
    "find-by-query": 37.2
}'




WITHOUT UNIQUE:

{
    "description": "sqlite node",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 3000,
    "time-to-first-insert": 25.84,
    "insert-documents-500": 8.97,
    "find-by-ids-3000": 19.61,
    "serial-inserts-200": 48.7,
    "serial-find-by-id-200": 0.92,
    "find-by-query": 16.88,
    "find-by-query-parallel-4": 18.08,
    "4x-count": 1.69,
    "property-access": 5.09
}

WITH UNIQUE:


{
    "description": "sqlite node",
    "platform": "node",
    "collectionsAmount": 4,
    "docsAmount": 3000,
    "time-to-first-insert": 26.68,
    "insert-documents-500": 8.06,
    "find-by-ids-3000": 19.67,
    "serial-inserts-200": 46.61,
    "serial-find-by-id-200": 0.94,
    "find-by-query": 16.96,
    "find-by-query-parallel-4": 13.08,
    "4x-count": 1.54,
    "property-access": 3.81
}
