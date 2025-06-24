// Name: Delete Records from Clipboard History
// Description: Filter and remove records from the clipboard history

import '@johnlindquist/kit';
import { ClipboardService } from '../lib/clipboard-service';

const db = new ClipboardService();

// Define ClipboardItem interface
interface ClipboardItem {
  ROWID: number;
  item: string;
  ts: number;
  app: string;
  apppath: string;
  dataType: number;
}

// Get filtered clipboards function
const getFilteredClipboards = (
  items: ClipboardItem[],
  filter: string,
  useRegex = false,
): ClipboardItem[] => {
  if (!filter) return items;

  if (useRegex) {
    try {
      const regex = new RegExp(filter, 'i');
      return items.filter((item) => regex.test(item.item));
    } catch (e) {
      return [];
    }
  }

  return items.filter((item) => item.item.toLowerCase().includes(filter.toLowerCase()));
};

// Track regex mode state and current input
let useRegexMode = false;
let currentInputValue = '';

// First prompt: Optional filter
const filter = await arg(
  {
    placeholder: 'Filter clipboard items to delete (leave blank to show all)',
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
          setPanel(await generateFilterPreview(currentInputValue, useRegexMode));
        },
        bar: 'right',
      },
    ],
  },
  async (input) => {
    currentInputValue = input;
    return await generateFilterPreview(input, useRegexMode);
  },
);

// Helper function to generate filter preview
async function generateFilterPreview(input: string, isRegexMode: boolean): Promise<string> {
  const getAllItemsSql = `SELECT ROWID, * FROM clipboard WHERE dataType = 0 ORDER BY ROWID DESC LIMIT 1000`;
  const allItems = db.raw(getAllItemsSql) as any[];

  // Map items to ensure ROWID is available
  const mappedItems = allItems.map((item) => ({
    ...item,
    ROWID: item.ROWID || item.rowid,
  })) as ClipboardItem[];

  const filteredItems = getFilteredClipboards(mappedItems, input, isRegexMode);

  if (filteredItems.length === 0) {
    return md('No clipboard items found matching this filter');
  }

  const preview = filteredItems
    .slice(0, 5)
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.item.substring(0, 80)}${item.item.length > 80 ? '...' : ''}`,
    )
    .join('\n');

  const modeText = isRegexMode ? ' (Regex mode)' : ' (Normal mode)';
  const countText =
    filteredItems.length > 5 ? `\n\n... and ${filteredItems.length - 5} more items` : '';

  return md(
    `**${filteredItems.length} items match filter${modeText}:**\n\`\`\`\n${preview}${countText}\n\`\`\``,
  );
}

// Get all filtered items - need to get the raw query to have ROWID
const getAllItemsSql = `SELECT ROWID, * FROM clipboard WHERE dataType = 0 ORDER BY ROWID DESC LIMIT 1000`;
const allItems = db.raw(getAllItemsSql) as any[];

// Map items to ensure ROWID is available (SQLite might return as lowercase)
const mappedItems = allItems.map((item) => ({
  ...item,
  ROWID: item.ROWID || item.rowid,
})) as ClipboardItem[];

// Debug: Check if ROWID is being returned
if (mappedItems.length > 0) {
  console.log('Sample item structure:', Object.keys(mappedItems[0]));
  console.log('First item ROWID:', mappedItems[0].ROWID);
}

const filteredItems = getFilteredClipboards(mappedItems, filter, useRegexMode);

if (filteredItems.length === 0) {
  notify('No items found matching the filter');
  db.close();
  exit();
}

// Second prompt: Number of records to delete
const countInput = await arg({
  placeholder: `Enter number to delete (1-${filteredItems.length}) or leave blank to delete all`,
  hint: `${filteredItems.length} filtered items available`,
});

let deleteCount: number;
if (countInput === '') {
  deleteCount = filteredItems.length;
} else {
  deleteCount = Number(countInput);
  if (isNaN(deleteCount) || deleteCount < 1 || deleteCount > filteredItems.length) {
    notify('Please enter a valid number within the range');
    db.close();
    exit();
  }
}

// Check if we need confirmation for large deletions
if (deleteCount > 20) {
  const confirm = await arg({
    placeholder: `This will delete ${deleteCount} clipboard items. Continue?`,
    hint: `${deleteCount} items will be permanently removed`,
    choices: [
      { name: 'Yes, delete them', value: 'yes' },
      { name: 'No, cancel', value: 'no' },
    ],
  });

  if (confirm === 'no') {
    notify('Deletion cancelled');
    db.close();
    exit();
  }
}

// Sort by ROWID descending to delete the most recent matches first
const itemsToDelete = filteredItems.sort((a, b) => b.ROWID - a.ROWID).slice(0, deleteCount);

// Debug log to see what we're trying to delete
console.log(
  'Items to delete:',
  itemsToDelete.map((item) => ({ ROWID: item.ROWID, item: item.item.substring(0, 50) })),
);

// Delete each item by ROWID
const deleteSql = 'DELETE FROM clipboard WHERE ROWID = ?';
let deletedCount = 0;
itemsToDelete.forEach((item) => {
  // Use ROWID from the item, with fallback to rowid (lowercase) if needed
  const rowId = item.ROWID || (item as any).rowid;
  if (rowId) {
    const result = db.raw(deleteSql, [rowId]);
    console.log(`Delete result for ROWID ${rowId}:`, result);
    if ((result as any).changes > 0) {
      deletedCount++;
    }
  } else {
    console.log('Warning: No ROWID found for item:', item.item.substring(0, 50));
  }
});

// Get the latest item to update the OS clipboard
const latestItem = db.getLatest(1);
if (latestItem.length > 0) {
  await clipboard.writeText(latestItem[0].item);
}

db.close();

notify(`${deletedCount} records removed from clipboard history`);
