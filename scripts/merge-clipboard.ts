// Name: Merge Clipboard
// Description: Merge multiple clipboard items into one

import '@johnlindquist/kit';
import { ClipboardService } from '../lib/clipboard-service';

const db = new ClipboardService();

interface ClipboardItem {
  ROWID: number;
  item: string;
  ts: number;
  app: string;
  apppath: string;
  dataType: number;
}

const getFilteredClipboards = async (
  filter: string,
  count?: number,
  useRegex = false,
): Promise<ClipboardItem[]> => {
  if (!filter) {
    // If no filter, just get items with limit
    let sql = `SELECT ROWID, *
               FROM clipboard
               WHERE dataType = 0
               ORDER BY ROWID DESC`;

    const params: number[] = [];
    if (count) {
      sql += ` LIMIT ?`;
      params.push(count);
    }

    return db.raw(sql, params) as ClipboardItem[];
  }

  if (useRegex) {
    // SQLite doesn't have native regex support, so we'll fetch all and filter in JS
    const sql = `SELECT ROWID, *
               FROM clipboard
               WHERE dataType = 0
               ORDER BY ROWID DESC`;

    const allItems = db.raw(sql) as ClipboardItem[];

    try {
      const regex = new RegExp(filter, 'i'); // Case-insensitive by default
      const filtered = allItems.filter((item) => regex.test(item.item));
      return count ? filtered.slice(0, count) : filtered;
    } catch (e) {
      // Invalid regex, return empty array
      return [];
    }
  } else {
    // Use LIKE for simple string matching
    let sql = `SELECT ROWID, *
               FROM clipboard
               WHERE dataType = 0
               AND item LIKE ?
               ORDER BY ROWID DESC`;

    const params: (string | number)[] = [`%${filter}%`];

    if (count) {
      sql += ` LIMIT ?`;
      params.push(count);
    }

    return db.raw(sql, params) as ClipboardItem[];
  }
};

const getMergedClipboards = async (items: ClipboardItem[], separator: string) => {
  if (separator === '\\n') separator = '\n';
  return items.map((row) => row.item.trim()).join(separator);
};

const writeMergedClipboards = async (mergedText: string) => {
  await clipboard.writeText(mergedText);
  db.close();
};

// Track regex mode state and current input
let useRegexMode = false;
let currentInputValue = '';

// First prompt: Optional filter with working toggle
const filter = await arg(
  {
    placeholder: 'Filter clipboard items (leave blank to show all)',
    hint: 'Type to filter | ctrl+r to toggle regex mode',
    strict: false,
    shortcuts: [
      {
        name: 'Toggle Regex Mode',
        key: 'ctrl+r',
        onPress: async () => {
          useRegexMode = !useRegexMode;
          setHint(
            `Type to filter | ctrl+r to toggle regex mode | Mode: ${useRegexMode ? 'REGEX' : 'NORMAL'}`,
          );
          // Update preview with current input
          setPanel(await generatePreview(currentInputValue, useRegexMode));
        },
        bar: 'right',
      },
    ],
  },
  async (input) => {
    currentInputValue = input; // Track current input
    return await generatePreview(input, useRegexMode);
  },
);

// Helper function to generate preview
async function generatePreview(input: string, isRegexMode: boolean): Promise<string> {
  if (!input) {
    // Show first 5 items when no filter
    const items = await getFilteredClipboards('', 5);
    if (items.length === 0) return md('No clipboard items found');

    const preview = items
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.item.substring(0, 80)}${item.item.length > 80 ? '...' : ''}`,
      )
      .join('\n');

    return md(`**First 5 clipboard items:**\n\`\`\`\n${preview}\n\`\`\``);
  }

  // Show filtered results
  const filteredItems = await getFilteredClipboards(input, 5, isRegexMode);

  if (filteredItems.length === 0) {
    if (isRegexMode) {
      try {
        new RegExp(input); // Test if it's a valid regex
        return md(`No items match this regex pattern: "${input}"`);
      } catch (e) {
        return md(`Invalid regex pattern: ${(e as Error).message}`);
      }
    }
    return md(`No items match this filter: "${input}"`);
  }

  const preview = filteredItems
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.item.substring(0, 80)}${item.item.length > 80 ? '...' : ''}`,
    )
    .join('\n');

  const totalCount = (await getFilteredClipboards(input, undefined, isRegexMode)).length;
  const showing = totalCount > 5 ? ` (showing 5 of ${totalCount})` : '';

  return md(`**Filtered results${showing}:**\n\`\`\`\n${preview}\n\`\`\``);
}

// Get filtered items using the same regex mode
const filteredItems = await getFilteredClipboards(filter, undefined, useRegexMode);

if (filteredItems.length === 0) {
  notify('No clipboard items found matching the filter');
  db.close();
  process.exit(0);
}

// Second prompt: Number of items to merge
const count = await arg(
  {
    placeholder: 'Number of clipboard items to merge',
    hint: `${filteredItems.length} items available`,
  },
  async (input) => {
    if (isNaN(Number(input)) || input.length === 0) return '';
    const numItems = Math.min(Number(input), filteredItems.length);
    const itemsToShow = filteredItems.slice(0, numItems);
    return md(`<pre>${await getMergedClipboards(itemsToShow, '\n')}</pre>`);
  },
);

const numCount = Math.min(Number(count), filteredItems.length);
const itemsToMerge = filteredItems.slice(0, numCount);

// Third prompt: Join character (optional, default to newline)
const separator = await arg(
  {
    placeholder: 'Enter the separator for merging (default: newline)',
    shortcuts: [
      {
        name: 'Use newline as separator',
        key: `${cmd}+enter`,
        onPress: () => submit('\n'),
      },
    ],
  },
  async (input) => {
    const sep = input || '\n';
    return md(`<pre>${await getMergedClipboards(itemsToMerge, sep)}</pre>`);
  },
);

const finalSeparator = separator || '\n';
const mergedText = await getMergedClipboards(itemsToMerge, finalSeparator);
await writeMergedClipboards(mergedText);
notify('Merged clipboard items and copied to clipboard');
