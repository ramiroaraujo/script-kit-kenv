// Name: Open URL in clipboard

import "@johnlindquist/kit"

//get the clipboard
let text = await clipboard.readText();

//get the first URL in the clipboard, if any
let url = text.match(/(https?:\/\/[^\s]+)/);

//if there's a URL, open it
if (url) {
    open(url[0]);
} else {
    notify("No URL in clipboard");
}
