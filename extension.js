// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode')
const _ = require('lodash')

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate (context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "dupchecker" is now active!')
  const output = vscode.window.createOutputChannel('DupChecker')

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand('extension.checkDup', function () {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    // vscode.window.showInformationMessage(`${dupLines.length} duplicates found.`);
    checkDup()
  })

  context.subscriptions.push(disposable)

  disposable = vscode.commands.registerCommand('extension.checkDupWithTrim', function () {
    vscode.window
      .showInputBox({
        prompt: 'Characters to trim'
      })
      .then(input => {
        if (input === undefined) return
        checkDup({ trimChars: input })
      })
  })

  context.subscriptions.push(disposable)

  disposable = vscode.commands.registerCommand('extension.checkDupWithRegex', function () {
    vscode.window
      .showInputBox({
        prompt: 'RegExp to match and select for each line'
      })
      .then(input => {
        if (input === undefined) return
        input = _.trim(input.trim(), '/')
        const re = new RegExp(input)
        if (!re) return vscode.window.showErrorMessage(`[Invalid Regex]: ${param.regex}`)
        checkDup({ regex: re })
      })
  })

  context.subscriptions.push(disposable)

  function checkDup (param) {
    param = param || {}
    let doc = vscode.window.activeTextEditor.document

    let targetLineNumbers
    const selections = vscode.window.activeTextEditor.selections
    if (selections.length === 1 && selections[0].isEmpty) {
      targetLineNumbers = _.range(doc.lineCount)
    } else {
      targetLineNumbers = _.sortedUniq(
        selections.map(selection => _.range(selection.start.line, selection.end.line + 1)).reduce((a, b) => a.concat(b))
      )
    }

    const config = vscode.workspace.getConfiguration('dupchecker')
    const needTrimStart = !!config.get('trimStart', true)
    const needTrimEnd = !!config.get('trimEnd', true)
    const needIgnoreCase = !!config.get('ignoreCase', false)

    const transformLine = getLineTransformer({
      trimChars: param.trimChars,
      regex: param.regex,
      needTrimStart: needTrimStart,
      needTrimEnd: needTrimEnd,
      needIgnoreCase: needIgnoreCase
    })

    const duplicates = targetLineNumbers
      .map(num => doc.lineAt(num).text)
      .map(text => transformLine(text))
      .map(
        (line, i, array) =>
          i > 0 && !_.isEmpty(line) && array.lastIndexOf(line, i - 1) >= 0
            ? {
                text: line,
                index: targetLineNumbers[i]
              }
            : null
      )
      .filter(v => v !== null)

    const dupLines = _.chain(duplicates).map(dup => dup.text).uniq().value()
    const dupLineNumbers = _.chain(duplicates).map(dup => dup.index).value()

    const configInfoList = []
    if (needTrimStart) configInfoList.push('trimStart')
    if (needTrimEnd) configInfoList.push('trimEnd')
    if (needIgnoreCase) configInfoList.push('ignoreCase')
    if (!_.isEmpty(param.trimChars)) configInfoList.push(`trimChars: ${param.trimChars}`)
    if (!_.isEmpty(param.regex)) configInfoList.push(`regex: /${param.regex}/`)

    output.clear()
    output.show()
    output.appendLine(configInfoList.map(info => `[${info}]`).join(' '))
    output.appendLine(`${dupLines.length} duplicate items found in ${targetLineNumbers.length} lines:`)
    output.appendLine('----------------------------------')
    dupLines.forEach(line => output.appendLine(line))

    vscode.window
      .showInformationMessage(`${dupLines.length} duplicate items found, need remove them?`, 'Yes', 'No')
      .then(select => {
        if (select === 'Yes') {
          const leaveEmptyLine = !!config.get('leaveEmptyLine', true)
          vscode.window.activeTextEditor.edit(edit => {
            dupLineNumbers.forEach(lineNum => {
              const line = doc.lineAt(lineNum)
              const range = leaveEmptyLine ? line.range : line.rangeIncludingLineBreak
              edit.delete(range)
            })
          })
        }
      })
  }

  function getLineTransformer (config) {
    config = config || {}
    const funcs = []
    if (config.needTrimStart) lines = funcs.push(_.trimStart)
    if (config.needTrimEnd) lines = funcs.push(_.trimEnd)
    if (!_.isEmpty(config.trimChars)) funcs.push(line => _.trim(line, config.trimChars))
    if (_.isRegExp(config.regex)) {
      funcs.push(line => {
        const match = config.regex.exec(line)
        return match ? match[match.length - 1] : ''
      })
    }

    if (config.needIgnoreCase) lines = funcs.push(_.toLower)
    return _.flow(funcs)
  }
}
exports.activate = activate

// this method is called when your extension is deactivated
function deactivate () {}
exports.deactivate = deactivate
