## Self update process

1. Locate the source on disk of the /ag-update skill by looking in the places that this harness loads skills from. This will be a folder called `ag-update` which will be referred to as $local-ag-update-path from now on
2. Shallow clone the ag-grid/skills github repo to a temporary folder which will be referred to as $tmp-ag-skills-clone
3. Compare the versions in $tmp-ag-skills-clone/skills/ag-update/VERSION.md and $local-ag-update-path/VERSION.md
4. If the versions are the same, tell the user that they are on the latest version and stop
5. If the versions are different, ask the user for confirmation that they want to overwrite the files in $local-ag-update-path with the latest content (indicate the old and new versions)
6. If the user agrees, delete the $local-ag-update-path folder and copy the new folder into the same position from $tmp-ag-skills-clone/skills/ag-update
