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
    // vscode.window.showInformationMessage(`${dupLines.size} duplicates found.`);
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
    param = param || {}
    if (!vscode.window.activeTextEditor || !vscode.window.activeTextEditor.document) {
      vscode.window.showErrorMessage('DupChecker: vscode text editor is not active!')
      return
    }

    let doc = vscode.window.activeTextEditor.document
    const largeFileLineCount = 100000

    output.show()
    output.clear()
    output.appendLine('------------------ Prepare ------------------')

    let startLineNumber = 0
    let endLineNumber = doc.lineCount

    const selections = vscode.window.activeTextEditor.selections
    if (selections.length > 1) {
      vscode.window.showWarningMessage('Oops! DupChecker cannot work with multiple selections... Please clear the selections or keep just only one!', 'Got it!')
      return
    }
    if (selections.length === 1 && !selections[0].isEmpty) {
      startLineNumber = selections[0].start.line
      endLineNumber = selections[0].end.line + 1
    }
    output.appendLine(`📄${doc.fileName}${startLineNumber !== 0 || endLineNumber !== doc.lineCount ? `:${startLineNumber + 1}-${endLineNumber}` : ''}`)
    output.append('🔍checking duplicates...')
    const totalLineCount = endLineNumber - startLineNumber
    if (totalLineCount >= largeFileLineCount) {
      vscode.window.showInformationMessage(
        `DupChecker may take a while to deal with the large file(${doc.lineCount.toLocaleString()} lines), please be patient ☕`, 'Sure!')
    }

    await new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, 0)
    })

    const beginTime = Date.now()

    const config = vscode.workspace.getConfiguration('dupchecker')
    const needTrimStart = !!config.get('trimStart', true)
    const needTrimEnd = !!config.get('trimEnd', true)
    const needIgnoreCase = !!config.get('ignoreCase', false)
    const needRemoveAllDuplicates = !!config.get('removeAllDuplicates', false)

    const transformLine = getLineTransformer({
      trimChars: param.trimChars,
      regex: param.regex,
      needTrimStart: needTrimStart,
      needTrimEnd: needTrimEnd,
      needIgnoreCase: needIgnoreCase
    })

    const cuckooFilterBucketSize = 2
    const cuckooFilterBucketNum = Math.ceil((1.2 * totalLineCount) / cuckooFilterBucketSize * 2)
    const cuckooFilterFingerprintSize = 3
    console.debug(`building cuckoo filter: cfsize=${cuckooFilterBucketNum}, bsize=${cuckooFilterBucketSize}, fpsize=${cuckooFilterFingerprintSize}`)
    const cuckooFilter = new CuckooFilter(cuckooFilterBucketNum, cuckooFilterBucketSize, cuckooFilterFingerprintSize)
    console.debug(`cuckoo filter build finished, time cost: ${(Date.now() - beginTime) / 1000}s`)
    const dupLines = new Set()
    const dupLineNumbers = []
    const firstOccurrenceMap = new Map()
    for (let i = startLineNumber; i < endLineNumber; ++i) {
      const line = transformLine(doc.lineAt(i).text)
      if (isDuplicate(line)) {
        dupLines.add(line)
        dupLineNumbers.push(i)
      }
      if (needRemoveAllDuplicates) {
        const hashCode = stringHash(line)
        if (!firstOccurrenceMap.has(hashCode)) {
          firstOccurrenceMap.set(hashCode, i)
        }
      }
    }

    const timeCost = (Date.now() - beginTime) / 1000
    output.appendLine(` done (${timeCost}s)`)
    await new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, 0)
    })

    const configInfoList = []
    if (needTrimStart) configInfoList.push('trimStart')
    if (needTrimEnd) configInfoList.push('trimEnd')
    if (needIgnoreCase) configInfoList.push('ignoreCase')
    if (!_.isEmpty(param.trimChars)) configInfoList.push(`trimChars: ${param.trimChars}`)
    if (!_.isEmpty(param.regex)) configInfoList.push(`regex: /${param.regex}/`)

    output.appendLine('------------------ Results ------------------')
    output.appendLine('⚙️' + configInfoList.map(info => `[${info}]`).join(' '))
    if (!cuckooFilter.reliable && dupLines.size > 0) {
      output.appendLine('⚠️There might be some unique items which are wrongly detected as duplicates, please double check the results manually!')
      vscode.window.showWarningMessage('ATTENTION! There might be some unique items which are wrongly detected as duplicates, please double check the results manually!')
    }
    output.appendLine(`✅${dupLines.size} duplicate value${dupLines.size > 1 ? 's' : ''} found in ${totalLineCount.toLocaleString()} lines:`)
    if (dupLines.size > 0) {
      dupLines.forEach(line => output.appendLine(line))
      const select = await vscode.window.showInformationMessage(`${dupLines.size} duplicate value${dupLines.size > 1 ? 's' : ''} found in ${timeCost}s, need remove them?`, 'Yes', 'No')
      if (select === 'Yes') {
        if (needRemoveAllDuplicates) {
          for (let dupLine of dupLines) {
            const index = firstOccurrenceMap.get(stringHash(dupLine))
            if (index >= 0) {
              dupLineNumbers.push(index)
            }
          }
        }
        removeLines(dupLineNumbers)
        vscode.window.showInformationMessage(`DupChecker: ${dupLineNumbers.length} duplicate line${dupLineNumbers.length > 1 ? 's' : ''} removed!`)
      }
    } else {
      vscode.window.showInformationMessage(`DupChecker: 0 duplicate value found in ${timeCost}s`, 'Got it!')
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

    function isDuplicate(line) {
      if (!line) return false
      const exist = cuckooFilter.contains(line)
      if (!exist) {
        cuckooFilter.add(line)
      }
      return exist
    }

    function removeLines(lineNumbers) {
      const leaveEmptyLine = !!config.get('leaveEmptyLine', true)
      vscode.window.activeTextEditor.edit(edit => {
        _.sortedUniq(lineNumbers.sort((a, b) => a < b)).forEach(lineNum => {
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
