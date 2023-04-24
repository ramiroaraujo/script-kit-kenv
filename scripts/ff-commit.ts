// Name: ff commit

import "@johnlindquist/kit"

//ask for add, update or fix
const type = await arg("What type of commit is this?", ["add", "update", "fix"])

//ask for message
const message = await arg("What is the commit message?")

const text = `git commit -m '[${type.toUpperCase()}] ${message}'`

//@todo add openai api to propose commit messages

//hide
await hide()

//type text with applescript (add a then delete it since it could be in normal mode, not insert mode)
await applescript(String.raw`
    tell application "System Events"
        keystroke "a"
        delay 0.1
        key code 51
        delay 0.1
        keystroke "${text}"
        delay 0.4
        key code 123
    end tell
`)
