# hash VS deepEqual

This tests if it is faster to hash objects to compare them or to make a deepEqual on them.

To execute the test do:

`npm install && npm start`

# result

deepEqual is 3 times faster

```bash
MEAURE HASH (MD5):
hash: 164.159ms
#########
#########
#########
MEAURE HASH (OBJ):
hashOBJ: 144.541ms
#########
#########
#########
MEAURE DEEP-EQUAL:
deepequal: 48.490ms
#########
#########
#########
MEAURE HASH2 (MD5):
hash2: 137.792ms
#########
#########
#########
MEAURE DEEP-EQUAL2:
deepequal2: 42.868ms
```
