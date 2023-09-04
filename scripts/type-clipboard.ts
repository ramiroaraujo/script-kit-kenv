// Name: Type Clipboard
// Description: Get the content of the clipboard and "keystroke" it without pasting
// Shortcut: ctrl+cmd+alt+shift+v

import "@johnlindquist/kit"

const clipboardText = await clipboard.readText()

if (clipboardText.length > 1000) {
    notify("Clipboard content is too long")
    exit()
}

await applescript(String.raw`
    set chars to count (get the clipboard)
    tell application "System Events"
        delay 0.1
        keystroke (get the clipboard)
    end tell
`)
