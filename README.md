# LowLight

Dims non-selected text so your selection visually pops. Great for screencasts, pair programming, and focused reading.

## How it works

When you toggle LowLight on, all text *outside* your current selection(s) is rendered at low opacity. Your selected text stays at full brightness, making it the natural focal point without any garish background colour.

## Usage

1. Select some text (supports multiple cursors / multi-selection).
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **LowLight: Toggle**.
3. Run **LowLight: Toggle** again to clear the dimming.

### Suggested keybinding

Add this to your `keybindings.json` (`Ctrl+K Ctrl+S` / `Cmd+K Cmd+S` to open it):

```jsonc
// Windows / Linux
{ "key": "ctrl+k ctrl+l", "command": "lowlight.toggle" }

// macOS
{ "key": "cmd+k cmd+l",   "command": "lowlight.toggle" }
```

## Configuration

| Setting | Default | Description |
|---|---|---|
| `lowlight.opacity` | `"0.15"` | Opacity of dimmed text. String between `"0"` and `"1"`. |

Changes to `lowlight.opacity` take effect immediately without reloading the window.

## License

MIT
