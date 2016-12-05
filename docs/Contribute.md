# Contribution
RxDB is a very new project and so relies on **your contribution** to be successfull.

## Run the tests
To make sure that RxDB runs as expected in every environment, it is important that many different developers run the tests.

- clone this repository
- ```npm install```
- ```npm test```

If the tests dont success, run node and browser-tests seperat:

- ```npm run test:node```
- ```npm run test:browser```

Now you can submitt a ticket with a description what has gone wrong or event better, you can fix the issue by yourself.

## Extend the example-projects
Feel free to add and extend the [example-projects](../examples). This is very helpfull to find bugs when combining RxDB with different technologies.

## Check out the pending features
[Help here](https://github.com/pubkey/rxdb/projects)


## Optimize the build-size
The builded javascript-file is very big. You can help by finding the big dependencies and optimize how they get bundled.

Run ```npm run disc``` to find how big each dependency is.

## Add features
You have a usefull feature in mind which you are missing with RxDB?
Create an issue to let other people implement it, or event implement it by yourself.
