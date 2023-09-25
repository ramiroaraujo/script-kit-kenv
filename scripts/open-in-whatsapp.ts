// Name: Open in WhatsApp

import '@johnlindquist/kit';

//get the text from the clipboard
let text = await clipboard.readText();

//normalize the text
text = text.replace(/[-() ]/g, '');

//validate if valid phone number
if (!text.match(/^(\+\d{12,13})|(\d{10,11})$/)) {
  notify('Invalid phone number');
  exit();
}

//assume Argentina if no country code since that's where I'm from
if (!text.startsWith('+')) {
  text = '+54' + text;
}

//open in WhatsApp
open(`https://wa.me/${text}`);
