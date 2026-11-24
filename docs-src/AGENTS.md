


## Icons

We use Icons from the [lucide library](https://lucide.dev/icons/)

## No round borders

The docs use square corners. Do not round the corners of boxes, cards, panels,
buttons, or images in new components and animations: no `border-radius` in CSS
or inline styles, and no `rx`/`ry` on SVG `<rect>` elements. The docs CSS
already sets `border-radius: 0` on code blocks, inline code, `<details>`,
alerts, and the modal content. Round shapes are fine only where the shape
itself is a circle, for example a moving dot or a status marker in an
animation.

Some older components still have rounded corners. Do not copy their radius
values. Use square corners when you build something new, and remove the radius
when you change an old component anyway.

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

On a comparison page, only mention the other project's last commit when it is
**at least 6 months old**. A project that shipped something three months ago is
maintained, and pointing at that date reads as looking for something bad to say
instead of making a point. When the gap is below the threshold, leave the
sentence out and let the other numbers carry the paragraph.
