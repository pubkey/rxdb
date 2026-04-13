# Generic Prompts for Github Repos

Prompts that are useful for any github or open source project which you can give your agent to improve the project.


## Clean up

Stuff to cleanup build and installations so we have less errors and warnings. 



### Remove warnings

Removing warnings is good to reduce the context size during agent runs because the terminal has less noisy output.

```txt
Run the installation and build and find the first warning. Fix that and make a pull request.
```


## Correctness


### Find a bug and fix it

```txt
Find a bug in FEATURE_NAME and make a test case
for it. First run the test case without a fix
and show me the output. Then apply a fix and
run the test case again and show me the output.
To reproduce the bug, you can only use the
public API and correct TypeScript type usage.
Using the API wrongly or with different types
does not count as a bug. Also in the test case
you can only use the public API and correct
TypeScript type usage, you cannot check for
internal APIs or behavior.

- Ensure all other tests run successful.
- Run the performance tests before and after
  the fix and show me the difference.
- Add the fix to the changelog.
- Ensure the linting is ok.
```

Example resulting PRs:

https://github.com/pubkey/rxdb/pull/8275


-------------


## Performance


```txt
Improve the performance of FEATURE_NAME.
Run the performance tests before and after
the improvement and show me the difference.
When you find multiple ways to improve
performance, make a performance difference
comparison table to show me which of the
improvements are the most effective. Only keep
the improvements that make a significant
performance improvement. After each improvement
ensure all tests still work and that the
linting is ok.
Add the improvement to the changelog.
```


-------------


## Code Quality

## Security

## SEO

-------------


```txt
Go through all documentation pages and make a list of them with a short description of what they are about and their internal link url. Then go through the content of each page and check which keywords could should be linked internally to other pages of the table. Only add links if that page does not already have a link to the target page.
```

-------------
