// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode')
const _ = require('lodash')
const stringHash = require("string-hash")
const { CuckooFilter } = require('cuckoo-filter')

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "DupChecker" is now active!')
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

  async function checkDup(param) {
    if (!vscode.window.activeTextEditor) {
      vscode.window.showErrorMessage('vscode text editor is not active!')
      return
    }

    let doc = vscode.window.activeTextEditor.document

    output.show()
    output.clear()
    output.appendLine('------------------ Prepare ------------------')

    const begin = Date.now()
    param = param || {}

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
    const needRemoveAllDuplicates = !!config.get('removeAllDuplicates', false)

    if (targetLineNumbers.length >= 500000) {
      vscode.window.showInformationMessage(`DupChecker may take a while to check this big file(${targetLineNumbers.length.toLocaleString()} lines), please be patient ☕`)
    }

    const transformLine = getLineTransformer({
      trimChars: param.trimChars,
      regex: param.regex,
      needTrimStart: needTrimStart,
      needTrimEnd: needTrimEnd,
      needIgnoreCase: needIgnoreCase
    })

    output.append('🔧transforming lines...')
    const transformBegin = Date.now()
    const firstOccurrenceMap = {}
    const transformedLines = targetLineNumbers.map((num, i) => {
      const text = transformLine(doc.lineAt(num).text)
      if (needRemoveAllDuplicates && firstOccurrenceMap[stringHash(text)] === undefined) {
        firstOccurrenceMap[stringHash(text)] = i
      }
      return text
    })
    const cuckooFilter = new CuckooFilter(Math.ceil(1.2 * transformedLines.length), 4, 4)
    output.appendLine(` done (${(Date.now() - transformBegin) / 1000}s)`)

    output.append('🔍checking duplicates...')
    const checkDupBegin = Date.now()
    const duplicates = []
    transformedLines.forEach((line, i, array) => {
      if (isDuplicate(line, i, array)) {
        duplicates.push({
          text: line,
          index: i
        })
      }
    })
    output.appendLine(` done (${(Date.now() - checkDupBegin) / 1000}s)`)

    const dupLines = _.chain(duplicates).map(dup => dup.text).uniq().value()
    let firstOccurrence = []
    if (needRemoveAllDuplicates) {
      firstOccurrence = dupLines.map(line => firstOccurrenceMap[stringHash(line)]).filter(v => v >= 0)
    }
    const dupLineNumbers = _.chain(duplicates).map(dup => dup.index).value().concat(firstOccurrence)

    const configInfoList = []
    if (needTrimStart) configInfoList.push('trimStart')
    if (needTrimEnd) configInfoList.push('trimEnd')
    if (needIgnoreCase) configInfoList.push('ignoreCase')
    if (!_.isEmpty(param.trimChars)) configInfoList.push(`trimChars: ${param.trimChars}`)
    if (!_.isEmpty(param.regex)) configInfoList.push(`regex: /${param.regex}/`)

    const timeCost = (Date.now() - begin) / 1000
    output.appendLine('------------------ Results ------------------')
    output.appendLine('⚙️' + configInfoList.map(info => `[${info}]`).join(' '))
    if (!cuckooFilter.reliable && dupLines.length > 0) {
      output.appendLine('⚠️There might be some unique items which are wrongly detected as duplicates, please double check the results manually!')
      vscode.window.showWarningMessage('ATTENTION! There might be some unique items which are wrongly detected as duplicates, please double check the results manually!')
    }
    output.appendLine(`✅${dupLines.length} duplicate item${dupLines.length > 1 ? 's' : ''} found in ${targetLineNumbers.length.toLocaleString()} lines (${timeCost}s total):`)
    if (dupLines.length > 0) {
      dupLines.forEach(line => output.appendLine(line))
      const select = await vscode.window.showInformationMessage(`${dupLines.length} duplicate item${dupLines.length > 1 ? 's' : ''} found in ${timeCost}s, need remove them?`, 'Yes', 'No')
      if (select === 'Yes') {
        removeDuplicates(dupLineNumbers)
      }
    } else {
      vscode.window.showInformationMessage(`${dupLines.length} duplicate item${dupLines.length > 1 ? 's' : ''} found in ${timeCost}s`, 'Got it!')
    }

    function getLineTransformer(cfg) {
      cfg = cfg || {}
      const funcs = []
      if (cfg.needTrimStart) { funcs.push(_.trimStart) }
      if (cfg.needTrimEnd) { funcs.push(_.trimEnd) }
      if (!_.isEmpty(cfg.trimChars)) { funcs.push(line => _.trim(line, cfg.trimChars)) }
      if (_.isRegExp(cfg.regex)) {
        funcs.push(line => {
          const match = cfg.regex.exec(line)
          return match ? match[match.length - 1] : ''
        })
      }
      if (cfg.needIgnoreCase) { funcs.push(_.toLower) }
      return _.flow(funcs)
    }

    function isDuplicate(line, i, array) {
      array = array || []
      line = line || array[i]
      if (!line) return false
      if (cuckooFilter) {
        const exist = cuckooFilter.contains(line)
        if (!exist) {
          cuckooFilter.add(line)
        }
        return exist
      } else {
        return i > 0 && array.lastIndexOf(line, i - 1) >= 0
      }
    }

    function removeDuplicates(dupLineNumbers) {
      const leaveEmptyLine = !!config.get('leaveEmptyLine', true)
      vscode.window.activeTextEditor.edit(edit => {
        dupLineNumbers.forEach(lineNum => {
          const line = doc.lineAt(lineNum)
          const range = leaveEmptyLine ? line.range : line.rangeIncludingLineBreak
          edit.delete(range)
        })
      })
    }
  }
}
exports.activate = activate

// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate
