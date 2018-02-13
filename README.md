# DupChecker README

## Features

**Check duplicate** lines in the file content and **dedup** if you need.

`ctrl+shift+p` Commands:
- `Check Duplicates`: Check duplicate lines in file immediately (trim empty characters only)
- `Check Duplicates With Trim Condition`: Check duplicate lines in file (trim both empty and customer input characters)
- `Check Duplicates With Regex Match`: Check duplicate lines in file using customer regex (trim empty characters and then compare regex matched string in each line)

## Use Case

### Check Duplicates
![feature X](images/demo1.gif)

### Check Duplicates With Trim Condition
![feature X](images/demo2.gif)

### Check Duplicates With Regex Match
![feature X](images/demo3.gif)

DupChecker will use the **last match** if you have multiple groups in regex.
