# DupChecker

## Features

**Check duplicate lines** in the file content or selection, and **remove them** if you need to keep the unique lines only.

🆕Since v0.1.0, DupChecker uses [cuckoo-filter](https://github.com/vijayee/cuckoo-filter) to speed up checking progress, and be able to handle large files with 100k+ lines.

❗️Note: for huge files with millions of lines, you may get an error like `Extension host terminated unexpectedly` which is caused by `JavaScript heap out of memory` exception, you'd better deal with the file outside vscode in this case.

### Multiple Check Modes
Commands:
- `Check Duplicates`: check duplicate lines immediately.
- `Check Duplicates With Trim Condition`: trim customer input characters first (on both start and end).
- `Check Duplicates With Regex Match`: capture matched substrings with customer input regex first (DupChecker will use the **last match** if you have multiple groups in regex).
- `Check Duplicates (For All Files)`: check duplicate lines for all files in workspace one by one.

### Configurations:

In **Preferences -> settings**:

![configurations](images/DupChecker-settings.png)

Or in `settings.json`:

```
"dupchecker": {
  "trimStart": true,            // trim starting whitespaces in each line, default: true
  "trimEnd": true,              // trim ending whitespaces in each line, default: true
  "ignoreCase": false,          // ignore case when comparing lines, default: false
  "ignoreLines": [],            // ignore lines that contain these strings, default: []
  "leaveEmptyLine": true,       // leave an empty line after removing duplicates if true, or remove whole line(including line break) if false, default: true
  "removeAllDuplicates": false  // remove all duplicate lines including the first occurrence if true, default: false
  "checkAllFilesInclude": "**"  // GlobPattern for files to include in [Check Duplicates (For All Files)] mode, default: "**"
  "checkAllFilesExclude": ""    // GlobPattern for files to exclude in [Check Duplicates (For All Files)] mode, default: ""
  "checkAllFilesNumLimit": 100  // Maximum number of files to include in [Check Duplicates (For All Files)] mode, default: 100
}
```

#### GlobPattern
Config `checkAllFilesInclude` and `checkAllFilesExclude` uses GlobPattern.
e.g. `*` stands for all files under a folder(non-recursive), `**` stands for all files under a folder(recursive).

Learn more syntax of [GlobPattern](https://code.visualstudio.com/api/references/vscode-api#GlobPattern).

## Use Case

### Check Duplicates
![feature X](images/demo1.gif)

### Check Duplicates With Trim Condition
![feature X](images/demo2.gif)

### Check Duplicates With Regex Match
![feature X](images/demo3.gif)

## Changelog

See the [Releases section of our GitHub project](https://github.com/jianbingfang/vscode-dup-checker/releases) for changelogs for each release version.

## License

This software is released under the terms of the [MIT license](https://github.com/jianbingfang/vscode-dup-checker/blob/master/LICENSE).
