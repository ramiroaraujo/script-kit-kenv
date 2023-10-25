// Name: (WIP) Merge / Split Clipboard
// Description: Merge or split clipboard content from clipboard history

import '@johnlindquist/kit';

const getMergedClipboards = async (count: number, separator: string) => {
  const history = await getClipboardHistory();
  if (separator === '\\n') separator = '\n';
  return history
    .slice(0, count)
    .filter((item) => item.type === 'text')
    .map((item) => item.value.trim())
    .join(separator);
};

const writeSplitClipboard = async (splitText: string[]) => {
  for (let i = 0; i < splitText.length; i++) {
    await clipboard.writeText(splitText[i]);
    await wait(150);
  }
};

const action = await arg('Choose action', ['Merge', 'Split']);

if (action === 'Merge') {
  const count = await arg(
    {
      placeholder: 'Enter the number of clipboard items to merge',
    },
    async (input) => {
      if (isNaN(Number(input)) || input.length === 0) return '';
      return md(`<pre>${await getMergedClipboards(parseInt(input), '\n')}</pre>`);
    },
  );
  const separator = await arg(
    {
      placeholder: 'Enter the separator for merging',
    },
    async (input) => {
      return md(`<pre>${await getMergedClipboards(parseInt(count), input)}</pre>`);
    },
  );
  const mergedText = await getMergedClipboards(parseInt(count), separator);
  await clipboard.writeText(mergedText);
  notify('Merged clipboard items and copied to clipboard');
} else if (action === 'Split') {
  let separator = await arg(
    {
      placeholder: 'Enter the separator for splitting',
    },
    async (input) => {
      if (input === '\\n') input = '\n';
      return md(`<pre>${(await clipboard.readText()).split(input).join('\n')}</pre>`);
    },
  );
  separator = separator === '\\n' ? '\n' : separator;
  const trim = await arg('Trim clipboard content?', ['Yes', 'No']);
  const splitText = (await clipboard.readText())
    .split(separator)
    .map((item) => (trim === 'Yes' ? item.trim() : item));
  await writeSplitClipboard(splitText);
  notify('Split clipboard content and stored in clipboard');
}
