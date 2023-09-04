// Name: ff convert yaml env for test

import "@johnlindquist/kit"

const text = await clipboard.readText();
const converted = text.split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.startsWith("#"))
    .map(line => line.split(': ').join('='))
    .map(line => line.replace(/'(.+)'/, '$1'))
    .join("\n")

await clipboard.writeText(converted)
await notify('Env variables converted and copied to clipboard')
