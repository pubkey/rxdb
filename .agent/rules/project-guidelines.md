---
trigger: always_on
---

# Project Guidelines (imported from CLAUDE.md)

## Development Workflow

```sh
# 1. Make changes

# 2. Build
npm run build

# 3. Run tests
npm run test:fast:memory

# 4. Run lint
npm run lint

# 5. Check TypeScript types
npm run check-types
```

## Changelog Rule
- Whenever you add a testcase or implement a FIX, add a changelog entry file under `orga/changelog/`.
- Prefer including a link to the root issue or pull request in that changelog line.

## Documentation Style
- SHOULD use clear, simple language.
- SHOULD use data and examples to support claims when possible.
- SHOULD be informative.
- SHOULD focus on practical, actionable insights.
- AVOID using em dashes (–) anywhere.
- AVOID constructions like "not just this, but also this".
- AVOID metaphors and cliches.
- AVOID generalizations.
- AVOID upfront warnings or notes, just the output requested.
- AVOID rhetorical questions.
- AVOID specific words like: very, really, literally, actually, certainly, probably, basically, delve, embark, enlightening, esteemed, shed light, craft, creative, imagine, realm, game-changer, unlock, discover, skyrocket, abyss, not alone, in a world where, revolutionize, disruptive, utilize, utilizing, dive deep, tapestry, illuminate, unveil, pivotal, intricate, elucidate, hence, furthermore, realm, however, harness, exciting, groundbreaking, cutting-edge, remarkable, it remains to be seen, glimpse into, navigating, landscape, stark, testament, in summary, in conclusion, moreover, boost, skyrocket, opened up, powerful, inquiries, ever-evolving.
- Review your response and ensure no em dashes.
