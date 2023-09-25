// Name: Open all links

import '@johnlindquist/kit';

const text = await clipboard.readText();
//get all the links from the clipboard
const links = text.match(/https?:\/\/[^\s]+/g);

if (!links) {
  notify('No links found in clipboard');
  exit();
}
//open all the links
for (const link of links) {
  open(link);
  await wait(200);
}
