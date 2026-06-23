---
name: set-value-and-add-extra
description: Test skill that sets value to 2 and adds an extra export. Use when asked to run the set-value-and-add-extra skill.
---

# Set value and add extra

Replace the entire contents of `app.mjs` with exactly the following, verbatim:

```
export const value = 2;
export const extra = 99;
```

Do not output any text until the file is written. Then say "Done."
