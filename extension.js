// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const _ = require('lodash');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "dupchecker" is now active!');
    const output = vscode.window.createOutputChannel('DupChecker');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.checkDup', function () {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        // vscode.window.showInformationMessage(`${dupLines.length} duplicates found.`);
        checkDup();
    });

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.checkDupWithTrim', function () {
        vscode.window.showInputBox({
            prompt: 'Characters to trim'
        }).then(input => {
            if (input === undefined) return;
            checkDup(input);
        })
    });

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.checkDupWithRegex', function () {
        vscode.window.showInputBox({
            prompt: 'RegExp to match and selet for each line'
        }).then(input => {
            if (input === undefined) return;
            checkDup('', input);
        })
    });

    context.subscriptions.push(disposable);

    function checkDup(trimChars, regex) {
        let doc = vscode.window.activeTextEditor.document;

        let targetLineNumbers;
        const selections = vscode.window.activeTextEditor.selections;
        if (selections.length === 1 && selections[0].isEmpty) {
            targetLineNumbers = _.range(doc.lineCount);
        } else {
            targetLineNumbers = _.sortedUniq(selections.map(selection => _.range(selection.start.line, selection.end.line + 1))
                                                       .reduce((a, b) => a.concat(b)));
        }

        let lines = targetLineNumbers.map(num => doc.lineAt(num).text);

        const config = vscode.workspace.getConfiguration('dupchecker');
        const needTrimStart = !!config.get('trimStart', true);
        const needTrimEnd = !!config.get('trimEnd', true);
        const needIgnoreCase = !!config.get('ignoreCase', false);

        if (needTrimStart) lines = lines.map(line => _.trimStart(line));
        if (needTrimEnd) lines = lines.map(line => _.trimEnd(line));

        if (!_.isEmpty(trimChars)) {
            lines = lines.map(line => _.trim(line, trimChars));
        }

        if (!_.isEmpty(regex)) {
            regex = _.trim(regex, '/');
            const re = new RegExp(regex);
            if (!re) return vscode.window.showErrorMessage(`[Invalid Regex]: ${regex}`);
            lines = lines.map(line => {
                const match = re.exec(line);
                return match ? match[match.length - 1] : '';
            })
        }

        const dupLines = [];
        const dupLineNumbers = [];
        for (let i = lines.length - 1; i > 0; i--) {
            const currentLine = lines[i];
            const stringComparer = getStringComparer(currentLine, needIgnoreCase);
            if (!_.isEmpty(currentLine) && _.findLastIndex(lines, stringComparer, i - 1) >= 0) {
                dupLineNumbers.push(targetLineNumbers[i]);
                if (_.findIndex(dupLines, stringComparer) === -1) {
                    dupLines.push(currentLine);
                }
            }
        }

        const configInfoList = [];
        if(needTrimStart) configInfoList.push('trimStart');
        if(needTrimEnd) configInfoList.push('trimEnd');
        if(needIgnoreCase) configInfoList.push('ignoreCase');
        if(!_.isEmpty(trimChars)) configInfoList.push(`trimChars: ${trimChars}`);
        if(!_.isEmpty(regex)) configInfoList.push(`regex: /${regex}/`);

        output.clear();
        output.show();
        output.appendLine(configInfoList.map(info => `[${info}]`).join(' '));
        output.appendLine(`${dupLines.length} duplicate items found in ${targetLineNumbers.length} lines:`);
        output.appendLine('----------------------------------');
        dupLines.reverse().forEach(line => output.appendLine(line));

        vscode.window.showInformationMessage(`${dupLines.length} duplicate items found, need dedup?`, 'Yes', 'No').then(select => {
            if (select === 'Yes') {
                vscode.window.activeTextEditor.edit(edit => {
                    dupLineNumbers.forEach(lineNum => edit.delete(doc.lineAt(lineNum).range));
                });
            }
        })
    }

    function getStringComparer(targetString, ignoreCase) {
        return text => ignoreCase
                     ? text.toLowerCase() === targetString.toLowerCase()
                     : text === targetString
    }
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;