// Name: Merge Clipboard
// Description: Merge multiple clipboard items into one

import '@johnlindquist/kit';
import { ClipboardService } from '../lib/clipboard-service';

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

const count = await arg(
  {
    placeholder: 'Number of clipboard items to merge',
  },
  async (input) => {
    if (isNaN(Number(input)) || input.length === 0) return '';
    return md(`<pre>${await getMergedClipboards(input, '\n')}</pre>`);
  },
);

const separator = await arg(
  {
    placeholder: 'Enter the separator for merging',
    shortcuts: [
      {
        name: 'Use newline as separator',
        key: `${cmd}+enter`,
        onPress: () => submit('\n'),
      },
    ],
  },
  async (input) => {
    return md(`<pre>${await getMergedClipboards(count, input)}</pre>`);
  },
);

const mergedText = await getMergedClipboards(count, separator);
await writeMergedClipboards(mergedText);
notify('Merged clipboard items and copied to clipboard');
