// Name: Split Clipboard
// Description: Split clipboard content into multiple items

import '@johnlindquist/kit';
import { ClipboardService } from '../lib/clipboard-service';

const db = new ClipboardService();

const getSplitClipboard = async (separator: string, useRegex = false) => {
  const currentClipboard = await clipboard.readText();

  if (useRegex) {
    try {
      const regex = new RegExp(separator, 'g');
      return currentClipboard.split(regex);
    } catch (e) {
      // If regex is invalid, fall back to literal split
      return currentClipboard.split(separator);
    }
  }

  return currentClipboard.split(separator);
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

// Track regex mode state and current input
let useRegexMode = false;
let currentInputValue = '';

let separator = await arg(
  {
    placeholder: 'Enter the separator for splitting',
    hint: 'Type separator | ctrl+r to toggle regex mode',
    shortcuts: [
      {
        name: 'Use newline as separator',
        key: `${cmd}+enter`,
        onPress: () => submit('\n'),
      },
      {
        name: 'Toggle Regex Mode',
        key: 'ctrl+r',
        onPress: async () => {
          useRegexMode = !useRegexMode;
          setHint(
            `Type separator | ctrl+r to toggle regex mode | Mode: ${useRegexMode ? 'REGEX' : 'NORMAL'}`,
          );
          // Update preview with current input
          const preview = await generateSplitPreview(currentInputValue, useRegexMode);
          setPanel(preview);
        },
        bar: 'right',
      },
    ],
  },
  async (input) => {
    currentInputValue = input; // Track current input
    return await generateSplitPreview(input, useRegexMode);
  },
);

// Helper function to generate preview
async function generateSplitPreview(input: string, isRegexMode: boolean): Promise<string> {
  if (!input) {
    const modeText = isRegexMode ? ' (Regex mode)' : ' (Normal mode)';
    return md(`**Enter a separator to see preview${modeText}**`);
  }

  try {
    const strings = await getSplitClipboard(input, isRegexMode);
    if (strings.length === 1) {
      return md(
        `**No splits found with this separator**\n\nThe clipboard would remain as one item.`,
      );
    }

    const preview = strings
      .slice(0, 10)
      .map((s, i) => `${i + 1}. ${s.substring(0, 50)}${s.length > 50 ? '...' : ''}`)
      .join('\n');
    const moreText = strings.length > 10 ? `\n\n... and ${strings.length - 10} more items` : '';
    const modeText = isRegexMode ? ' (Regex mode)' : ' (Normal mode)';

    const warningText =
      strings.length > 20 ? `\n\n⚠️ **Warning: This will create ${strings.length} items**` : '';

    return md(
      `**Preview: ${strings.length} items after split${modeText}**${warningText}\n\`\`\`\n${preview}${moreText}\n\`\`\``,
    );
  } catch (e) {
    if (isRegexMode) {
      return md(`**Invalid regex pattern:** ${(e as Error).message}`);
    }
    return md(`**Error:** ${(e as Error).message}`);
  }
}

separator = separator === '\\n' ? '\n' : separator;

// Get the split text to check the count
const splitText = await getSplitClipboard(separator, useRegexMode);

// Check if we need confirmation for large splits
if (splitText.length > 20) {
  const confirm = await arg({
    placeholder: `This will create ${splitText.length} clipboard items. Continue?`,
    hint: `The clipboard will be split into ${splitText.length} separate items`,
    choices: [
      { name: 'Yes, continue', value: 'yes' },
      { name: 'No, cancel', value: 'no' },
    ],
  });

  if (confirm === 'no') {
    notify('Split operation cancelled');
    process.exit(0);
  }
}

await writeSplitClipboard(splitText);
notify(`Split clipboard into ${splitText.length} items`);
