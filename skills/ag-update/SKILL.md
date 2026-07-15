---
name: ag-update
description: Update AG Grid and/or AG Charts to a newer version
---

This skill guides you through the process of updating a repo that uses AG Grid products (AG Grid, AG Charts and AG Studio).

To make the process more reliable for LLMs to follow, there is a nodejs script that analyses the repo. It scans for projects that use AG products, detects the changes required to update each one to the latest available version, and writes one markdown report per project. Use these reports to plan the update with the user.

## Rules

- Follow the instructions written to stderr by the script. The first line of output will begin "SUCCESS:" if the script finished and produced reports; or "ERROR:" if it encountered an issue that needs to be resolved before trying again.
- If you are instructed "Tell the user X" then show the message to the user and **continue**
- If you are instructed "Ask the user X" then show the question to the user and **stop**. Do not continue until you receive a response. Use your built-in tool for asking questions IF it is appropriate for the kind and number of questions you need to ask, otherwise use plain conversation.

TODO inline the two above instructions into the output of each invocation.

## Running the script

Tell the user "Welcome to the AG Update skill. Let's start by gathering some context on your application"

Run `node <ag-update-folder>/scripts/analyse-update.js` where <ag-update-folder> is the path to the folder containing this SKILL.md.

Invoke the command with no named arguments, unless you have already been told to update a single project in which case set --root to that folder.

On success, the script's output summarises the projects found and the reports written, and instructs you how to proceed: confirm the target version and project set with the user, then use the reports to plan the update.

## Arguments

Invoking with no arguments is the normal case. If an error message tells you to add arguments, it will tell you which. For documentation, the supported arguments are:

    --root=path # folder to scan for projects (optional; default=root of the current Git repo)
    --output-folder=path # (optional; folder to write output files to; default is to pick a new temporary folder under os.tmpdir())
    --allow-old-version (skip the version check, allowing an old version of the skill to be used)
    --changes-url-prefix=url (optional; default "https://ag-grid.com/", file urls supported; used for testing do not add this argument unless explicitly instructed to)
