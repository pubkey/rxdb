


## Icons

We use Icons from the [lucide library](https://lucide.dev/icons/)

## Relative dates

Never write a relative time span into the prose. A sentence that says "no
commit in four years" is wrong a year later, and nobody remembers to update it.
Use the `TimeSince` component from
[`src/components/time-since.tsx`](./src/components/time-since.tsx) instead. It
is registered globally, so no import is needed:

```mdx
The last commit was in March 2022, <TimeSince date="2022-03-28" />.
```

It renders "4 years ago", picking days below a month, months below two years
and years above that. Pass `unit="months"` or `unit="years"` to force one of
them. The value is calculated when the page renders, so the static HTML carries
the distance as of the last docs build and the browser corrects it on
hydration. Keep the absolute date in the sentence as well, because that is the
part a reader can verify.
