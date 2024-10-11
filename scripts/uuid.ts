// Name: Generate UUID
// Description: Generate a random UUID and display it in Markdown

import '@johnlindquist/kit';

const uniqueId = crypto.randomUUID();

await clipboard.writeText(uniqueId);
await notify({ silent: true, title: 'UUID generated and copied to clipboard' });
