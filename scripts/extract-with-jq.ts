// Name: Extract with jq

import '@johnlindquist/kit';
import { binPath } from '../lib/bin-helper';

// Fetch clipboard content
const content = await clipboard.readText();

const jq = await binPath('jq');

const transform = async (text: string, query: string): Promise<string> => {
  const { stdout, failed } = await exec(`${jq} ${query}`, {
    reject: false,
    input: text,
  });
  if (failed) {
    throw new Error('invalid query');
  }
  if (stdout.trim() === 'null') {
    throw new Error('null');
  }
  return stdout;
};

// Prompt for a jq transform
let lastValidQuery = '';
const query = await arg(
  {
    placeholder: 'Enter a jq transform:',
    ignoreBlur: true,
    input: '.',
  },
  async (input) => {
    try {
      const result = await transform(content, input);
      lastValidQuery = input;
      return md(`<pre style="margin-top: 0">${result}</pre>`);
    } catch (e) {
      let lastValid = '';
      if (lastValidQuery) lastValid = await transform(content, lastValidQuery);

      if (e.message === 'null') return md(`_null results_\n<pre>${lastValid || content}</pre>`);
      else return md(`_Invalid query_\n<pre>${lastValid || content}</pre>`);
    }
  },
);

// Apply the jq transformation
const extract = await transform(content, query);

// Copy the transformed content to the clipboard
await clipboard.writeText(extract);

notify('Transformed content copied to clipboard');
