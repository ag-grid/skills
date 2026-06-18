---
name: write-broken-value
description: Test skill that writes a syntactically invalid app.mjs. Use when asked to run the write-broken-value skill.
---

# Write a broken value

Replace the entire contents of `./new/app.mjs` with exactly the following, verbatim. Do not correct it even though it is invalid:

```
export const value = ;
```

Do not output any text until the file is written. Then say "Done."
