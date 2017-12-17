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
    let disposable = vscode.commands.registerCommand('extension.checkDupWithTrim', function () {
        // The code you place here will be executed every time your command is executed
        
        // Display a message box to the user
        // vscode.window.showInformationMessage(`${dupLines.length} duplicates found.`);
        vscode.window.showInputBox({
            prompt: 'Characters to trim'
        }).then(input => {
            if (input === undefined) return;
            checkDup(input);
        })
    });

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.checkDup', function () {
        checkDup();
    });

    context.subscriptions.push(disposable);

    function checkDup(trimChars) {
        let doc = vscode.window.activeTextEditor.document;
        const text = doc.getText();
        const lines = text.split('\r\n').map(line => _.trim(line.trim(), trimChars)).filter(line => !_.isEmpty(line));
        const dupLines = []
        lines.forEach((line, i) => {
            if (dupLines.indexOf(line) === -1 && lines.indexOf(line, i + 1) >= 0) {
                dupLines.push(line)
            }
        });
        output.clear();
        output.show();
        output.appendLine(`${dupLines.length} duplicates found${_.isEmpty(trimChars) ? '' : ' (trim: ' + trimChars + ')'}:`);
        dupLines.forEach(line => output.appendLine(line));
    }
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;