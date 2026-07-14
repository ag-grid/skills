---
name: ag-update
description: Update AG Grid and/or AG Charts to a newer version
---

This skill guides you through the process of updating a repo that uses AG Grid products (AG Grid, AG Charts and AG Studio).

To make the process more reliable for LLMs to follow, there is a nodejs script that will guide you through the process. An update often requires multiple invocations of the script to gather the information required. Each invocation will return plain English instructions telling you what to do next.

The script is self-documenting. Follow the instructions it provides in the message each invocation. If more information is required, the message will contain details of the additional arguments you should pass to provide the information.

The final output of the script is a set of markdown files containing the information you will need to plan an update to the application(s) in the local repo.

## Rules

- The script is stateful. On first invocation (where you pass the `init` command) it will create a temporary folder in which to store working files. Every subsequent invocation **must** be passed the path to the working folder in order to continue correctly. The instructions written by every intermediate invocation will include the correct arguments required to re-invoke the script with the correct working path
- Follow the instructions written to stderr by each invocation of the script. The first line of output will begin "NEXT:" if the last invocation worked and more information is required; "ERROR:" if the last invocation encountered an issue that needs to be resolved before trying again; or "SUCCESS:" if the script is finished.
- If you are instructed "Tell the user X" then show the message to the user and **continue**
- If you are instructed "Ask the user X" then show the question to the user and **stop**. Do not continue until you receive a response. Use your built-in tool for asking questions IF it is appropriate for the kind and number of questions you need to ask, otherwise use plain conversation.

TODO inline the two above instructions into the output of each invocation.

## Starting the process

Tell the user "Welcome to the AG Update skill. Let's start by gathering some context on your application"

Begin the process by invoking `node path/to/skills/ag-update/scripts/analyse-update.js init`

Invoke the command initially with no named arguments, unless:

- if you have already been told the version to update, pass --target-version
- if you have already been told the projects to update, pass one or more --project args or set --root to a folder containing the projects to update

## Arguments

In general, follow the instructions written to stderr by each invocation. If you need to add arguments to the invocation, the instructions will tell you which arguments. For documentation, the supported arguments are:

The following arguments are supported

    <command> # the first positional argument: "init" or "refine"
    --output-folder=path # folder for reports and cache. Required for "refine" calls. Optional on "init" calls (and if provided on init, must be an empty directory)
    --target-version=major[.minor] # version to upgrade to e.g. "36" or "35.3"
    --project=path # folder containing package.json (optional; multiple supported; default=all Git-tracked tracked package.json files under cwd)
    --source=path # file or folder containing source files to update (optional; default=all Git-tracked files in each project)
    --changes-url-prefix=url (optional; default "https://ag-grid.com/", file urls supported)
    --allow-old-version (skip the version check, allowing an old version of the skill to be used)
