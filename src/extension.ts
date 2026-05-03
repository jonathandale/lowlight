import * as vscode from "vscode";

// Keyed by document URI string rather than TextEditor reference because VS Code
// can create multiple TextEditor objects for the same document (e.g. split
// panes), and a Map<TextEditor, …> would silently create duplicate entries that
// never get cleaned up when those transient editor objects are GC'd.
type EditorState = Map<string, vscode.Range[]>;

let decorationType: vscode.TextEditorDecorationType | null = null;
const state: EditorState = new Map();
let statusBarItem: vscode.StatusBarItem | null = null;

function getOpacity(): string {
  const cfg = vscode.workspace.getConfiguration("lowlight").get<string>("opacity", "0.15");
  const n = parseFloat(cfg);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? cfg : "0.15";
}

function createDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    opacity: getOpacity(),
  });
}

function updateStatusBar(editor: vscode.TextEditor | undefined): void {
  if (!statusBarItem) return;
  if (!editor) {
    statusBarItem.hide();
    return;
  }
  const active = state.has(editor.document.uri.toString());
  statusBarItem.text = `$(color-mode)`;
  statusBarItem.tooltip = active ? "LowLight: On — click to toggle off" : "LowLight: Off — click to toggle on";
  statusBarItem.color = active ? new vscode.ThemeColor("statusBarItem.warningForeground") : undefined;
  statusBarItem.show();
}

function buildComplementRanges(document: vscode.TextDocument, selections: readonly vscode.Selection[]): vscode.Range[] {
  const lastLine = document.lineCount - 1;
  const docStart = new vscode.Position(0, 0);
  const docEnd = document.lineAt(lastLine).range.end;

  // Flatten selections into a boundary list: [docStart, sel0.start, sel0.end,
  // sel1.start, sel1.end, …, docEnd], then zip into pairs to get the gaps.
  const boundaries: vscode.Position[] = [docStart];
  for (const sel of selections) {
    boundaries.push(sel.start, sel.end);
  }
  boundaries.push(docEnd);

  const ranges: vscode.Range[] = [];
  for (let i = 0; i < boundaries.length - 1; i += 2) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    // Drop ranges where start >= end to avoid invalid/empty decorations.
    if (start.isBefore(end)) {
      ranges.push(new vscode.Range(start, end));
    }
  }
  return ranges;
}

function applyToggle(editor: vscode.TextEditor): void {
  if (!decorationType) return;

  const key = editor.document.uri.toString();
  const hasLowlight = state.has(key);
  const hasSelection = editor.selections.some((s) => !s.isEmpty);

  if (hasLowlight) {
    // Clear regardless of whether there's a selection.
    editor.setDecorations(decorationType, []);
    state.delete(key);
  } else if (hasSelection) {
    const ranges = buildComplementRanges(editor.document, editor.selections);
    editor.setDecorations(decorationType, ranges);
    state.set(key, ranges);
  }
  // No selection + no active lowlight → do nothing.

  updateStatusBar(editor);
}

export function activate(context: vscode.ExtensionContext): void {
  decorationType = createDecorationType();

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "lowlight.toggle";
  updateStatusBar(vscode.window.activeTextEditor);

  const toggleCmd = vscode.commands.registerCommand("lowlight.toggle", () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage("LowLight: No active text editor.");
      return;
    }
    applyToggle(editor);
  });

  // Re-create the decoration type when the opacity setting changes, and
  // reapply decorations to any currently-dimmed editors.
  const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
    if (!e.affectsConfiguration("lowlight.opacity")) return;

    decorationType?.dispose();
    decorationType = createDecorationType();

    for (const editor of vscode.window.visibleTextEditors) {
      const key = editor.document.uri.toString();
      const ranges = state.get(key);
      if (ranges && decorationType) {
        editor.setDecorations(decorationType, ranges);
      }
    }
  });

  // Clean up state when an editor is closed so we don't leak map entries.
  const closeWatcher = vscode.workspace.onDidCloseTextDocument((doc) => {
    state.delete(doc.uri.toString());
  });

  // When switching editors: reapply decorations (lost when editor is hidden)
  // and update the status bar to reflect the newly active editor's state.
  const activeEditorWatcher = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && decorationType) {
      const ranges = state.get(editor.document.uri.toString());
      if (ranges) {
        editor.setDecorations(decorationType, ranges);
      }
    }
    updateStatusBar(editor);
  });

  context.subscriptions.push(statusBarItem, toggleCmd, configWatcher, closeWatcher, activeEditorWatcher);
}

export function deactivate(): void {
  decorationType?.dispose();
  decorationType = null;
  statusBarItem?.dispose();
  statusBarItem = null;
  state.clear();
}
