// Name: Merge / Split Alfred Clipboard
// Description: Merge or split clipboard content using Alfred app's clipboard

import '@johnlindquist/kit';
import { ClipboardService } from '../lib/clipboard-service';
import { Action } from '../../../../.kit';

const db = new ClipboardService();

const getMergedClipboards = async (count, separator) => {
  const clipboards = db.getLatest(count);
  if (separator === '\\n') separator = '\n';
  return clipboards.map((row) => row.item.trim()).join(separator);
};

const writeMergedClipboards = async (mergedText) => {
  await clipboard.writeText(mergedText);

  db.close();
};

const getSplitClipboard = async (separator: string, trim: boolean) => {
  const currentClipboard = await clipboard.readText();
  return currentClipboard.split(separator).map((item) => (trim ? item.trim() : item));
};

const writeSplitClipboard = async (splitText: string[]) => {
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

const actions: Action[] = [
  {
    shortcut: `${cmd}+enter`,
    name: 'LF as separator',
    visible: true, // Display shortcut in the prompt
    flag: 'lf',
  },
];

const action = await arg('Choose action', ['Split each line', 'Merge', 'Split'], actions);

if (action === 'Split each line') {
  const splitText = (await clipboard.readText())
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  await writeSplitClipboard(splitText);
  notify('Split clipboard content line by line and stored in Alfred clipboard');
} else if (action === 'Merge') {
  const count = await arg(
    {
      placeholder: 'clipboard items to merge',
      actions,
    },
    async (input) => {
      if (isNaN(Number(input)) || input.length === 0) return '';
      return md(`<pre>${await getMergedClipboards(input, '\n')}</pre>`);
    },
  );
  const separator = flag.lf
    ? '\n'
    : await arg(
        {
          placeholder: 'Enter the separator for merging',
        },
        async (input) => {
          return md(`<pre>${await getMergedClipboards(count, input)}</pre>`);
        },
      );
  const mergedText = await getMergedClipboards(count, separator);
  await writeMergedClipboards(mergedText);
  notify('Merged clipboard items and copied to clipboard');
} else if (action === 'Split') {
  let separator = flag.lf
    ? '\n'
    : await arg(
        {
          placeholder: 'Enter the separator for splitting',
        },
        async (input) => {
          if (input === '\\n') input = '\n';
          const strings = await getSplitClipboard(input, true);
          return md(`<pre>${strings.join('\n')}</pre>`);
        },
      );
  separator = separator === '\\n' ? '\n' : separator;
  const trim = flag.lf ? 'Yes' : await arg('Trim clipboard content?', ['Yes', 'No']);
  const splitText = await getSplitClipboard(separator, trim === 'Yes');
  await writeSplitClipboard(splitText);
  notify('Split clipboard content and stored in Alfred clipboard');
}
