// Name: Delete Records from Clipboard History
// Description: Remove the specified number of latest records from the clipboard history and update the OS clipboard with the next latest item.

import '@johnlindquist/kit';
import { ClipboardService } from '../lib/clipboard-service';

const db = new ClipboardService();

const input = await arg({
  placeholder: 'Enter the number of latest records to delete:',
});

const count = Number(input);

if (isNaN(count)) {
  notify('Please enter a valid number.');
  exit();
}

const items = db.getLatest(count + 1);

if (items.length <= 1) {
  notify(
    items.length === 1
      ? { title: 'Not deleting anything', message: 'Only one record in the clipboard history.' }
      : { title: 'Not deleting anything', message: 'No records in the clipboard history.' },
  );
  exit();
}

if (items.length < count) {
  notify({
    title: 'Not enough records',
    message: `There are only ${items.length} records. Will delete all but the last one.`,
  });
}

const [last, ...toDelete] = items.reverse();

db.deleteLatest(toDelete.length);

db.close();

await clipboard.writeText(last.item);

notify(`${toDelete.length} records removed from clipboard history. OS clipboard updated.`);
