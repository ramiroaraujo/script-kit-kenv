// Name: Open Medium link

import '@johnlindquist/kit';

let link = await clipboard.readText();

while (!new URL(link).protocol.startsWith('http')) {
  link = await arg('Enter a valid link:');
}

open(`https://freedium.cfd/${link}`);
