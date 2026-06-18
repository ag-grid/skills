---
name: set-value-to-2
description: Test skill that sets the exported value in app.mjs to 2. Use when asked to run the set-value-to-2 skill.
---

# Set value to 2

Replace the entire contents of the file `./new/app.mjs` with exactly the following, verbatim, and change nothing else:

```
export const value = 2;
```

Do not output any text until the file is written. Then say "Done."
