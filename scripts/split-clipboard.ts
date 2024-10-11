// Name: Split Clipboard
// Description: Split clipboard content into multiple items

import '@johnlindquist/kit';
import { ClipboardService } from '../lib/clipboard-service';

const db = new ClipboardService();

const getSplitClipboard = async (separator, trim) => {
  const currentClipboard = await clipboard.readText();
  return currentClipboard.split(separator).map((item) => (trim ? item.trim() : item));
};

const writeSplitClipboard = async (splitText) => {
  const lastTsResult = db.getLatest(1);
  let lastTs = lastTsResult.length > 0 ? Number(lastTsResult[0].ts) : 0;
  const insertSql = `INSERT INTO clipboard (item, ts, dataType, app, appPath)
                     VALUES (?, ?, 0, 'Kit', '/Applications/Kit.app')`;

  for (let i = 0; i < splitText.length - 1; i++) {
    lastTs += 1;
    db.raw(insertSql, [splitText[i], lastTs]);
  }

  db.close();
  await clipboard.writeText(splitText[splitText.length - 1]);
};

let separator = await arg(
  {
    placeholder: 'Enter the separator for splitting',
    shortcuts: [
      {
        name: 'Use newline as separator',
        key: `${cmd}+enter`,
        onPress: () => submit('\n'),
      },
    ],
  },
  async (input) => {
    const strings = await getSplitClipboard(input, true);
    return md(`<pre>${strings.join('\n')}</pre>`);
  },
);

const trim = await arg('Trim clipboard content?', ['Yes', 'No']);

separator = separator === '\\n' ? '\n' : separator;
const splitText = await getSplitClipboard(separator, trim === 'Yes');
await writeSplitClipboard(splitText);
notify('Split clipboard content and stored in clipboard history');
