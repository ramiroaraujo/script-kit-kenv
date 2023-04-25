// Name: Open all links

import "@johnlindquist/kit"

const text = await clipboard.readText()
//get all the links from the clipboard
const links = text.match(/https?:\/\/[^\s]+/g)

//open all the links
for (const link of links) {
    await open(link)
}
