# Object-Data-Relational-Mapping

Like [mongoose](http://mongoosejs.com/docs/guide.html#methods), RxDB has ORM-capabilities which can be used to add specific behavior to documents and collections.

## statics

Statics are defined collection-wide and can be called on the collection.

### Add statics to a collection

To add static functions, pass a `statics`-object when you create your collection. The object contains functions, mapped to their function-names.

```javascript
const heroes = await myDatabase.collection({
  name: 'heroes',
  schema: mySchema,
  statics: {
    scream: function(){
        return 'AAAH!!';
    }
  }
});

console.log(heroes.scream());
// 'AAAH!!'
```

You can also use the this-keyword which resolves to the collection:

```javascript
const heroes = await myDatabase.collection({
  name: 'heroes',
  schema: mySchema,
  statics: {
    whoAmI: function(){
        return this.name;
    }
  }
});
console.log(heroes.whoAmI());
// 'heroes'
```

## instance-methods

Instance-methods are defined collection-wide. They can be called on the RxDocuments of the collection.

### Add instance-methods to a collection

```javascript
const heroes = await myDatabase.collection({
  name: 'heroes',
  schema: mySchema,
  methods: {
    scream: function(){
        return 'AAAH!!';
    }
  }
});
const doc = await heroes.findOne().exec();
console.log(doc.scream());
// 'AAAH!!'
```

Here you can also use the this-keyword:

```javascript
const heroes = await myDatabase.collection({
  name: 'heroes',
  schema: mySchema,
  methods: {
    whoAmI: function(){
        return 'I am ' + this.name + '!!';
    }
  }
});
await heroes.insert({
  name: 'Skeletor'
});
const doc = await heroes.findOne().exec();
console.log(doc.whoAmI());
// 'I am Skeletor!!'
```

## attachment-methods

Attachment-methods are defined collection-wide. They can be called on the RxAttachemnts of the RxDocuments of the collection.

```javascript
const heroes = await myDatabase.collection({
  name: 'heroes',
  schema: mySchema,
  attachments: {
    scream: function(){
        return 'AAAH!!';
    }
  }
});
const doc = await heroes.findOne().exec();
const attachment = await doc.putAttachment({
    id: 'cat.txt',
    data: 'meow I am a kitty',
    type: 'text/plain'
});
console.log(attachment.scream());
// 'AAAH!!'
```

---------
If you are new to RxDB, you should continue [here](./population.md)
