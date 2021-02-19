# Change Log

## v0.1.7 - 2021/02/19
- Add MIT license.

## v0.1.6 - 2019/11/04
- Fix "Assignment to a constant error" bug in regex check mode.

## v0.1.5 - 2019/10/21
- Some config default value changes.

## v0.1.4 - 2019/10/20
- Exceptions will not interrupt checking progress in `Check Duplicates (For All Files)` mode.
- Skip non-textual files in `Check Duplicates (For All Files)` mode.

## v0.1.3 - 2019/10/19
- Change default value of config `checkAllFilesInclude` to `**`.
- Fix bug of "remove duplicates" not working if lose focus on the file.

## v0.1.2 - 2019/10/18
- Support new check mode `Check Duplicates (For All Files)`.

## v0.1.1 - 2019/09/25
- Optimize memory usage.
- Better information output.

## v0.1.0 - 2019/09/24
- Use [cuckoo-filter](https://github.com/vijayee/cuckoo-filter) to speed up checking progress.
- Support large file(up to hundreds of thousands of lines).
- Enable configuration editing in vscode settings view.

## v0.0.9 - 2018/08/13
- Add new configuration `removeAllDuplicates` to support removing duplicates including the first occurrence.

## v0.0.8 - 2018/03/12
- Add new configuration `leaveEmptyLine` to support removing line break.

## v0.0.7 - 2018/03/06
- Add new configuration `ignoreCase` to support case insensitive comparison.
- Add new configuration `trimStart` and `trimEnd` to support self configuration on leading and trailing whitespace trimming.

## v0.0.6 - 2018/02/13
- Support duplicate checking in text selection.
- Fix not working bug in `trim mode`.

## v0.0.5 - 2018/01/17
- Fix bug when file eol is `\n`.

## v0.0.4 - 2018/01/10
- Fix bug of removing wrong line if there are empty lines in file.

## v0.0.3 - 2017/12/19
- Support remove duplicate lines after duplicate checking.

## v0.0.2 - 2017/12/18
- Support new check mode `Check Duplicates With Regex Match`.

## v0.0.1 - 2017/12/17
- Initial release.
- Support duplicate lines checking in file.
- Support customer input characters trimming when comparing lines.