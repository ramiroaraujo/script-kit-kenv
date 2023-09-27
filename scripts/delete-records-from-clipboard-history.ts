// Name: Delete Records from Clipboard History
// Description: Remove the specified number of latest records from the clipboard history and update the OS clipboard with the next latest item.

import '@johnlindquist/kit';
import { getEnv } from '../lib/env-helper';

const Database = await npm('better-sqlite3');
let db;
try {
  const databasePath = getEnv('ALFRED_DATABASE_PATH');
  db = new Database(databasePath);
} catch (e) {
  notify({
    title: 'Clipboard history database not found',
    message: 'Try looking in Alfred pref -> Advanced -> Reveal in Finder',
  });
  exit();
}

const queryClipboard = async (sql, params = []) => {
  return db.prepare(sql).all(...params);
};

const deleteRecords = async (count) => {
  const sql = `DELETE FROM clipboard WHERE ROWID IN (SELECT ROWID FROM clipboard WHERE dataType = 0 ORDER BY ROWID DESC LIMIT ?)`;
  db.prepare(sql).run(count);
};

const getLatestClipboard = async () => {
  const sql = `SELECT item FROM clipboard WHERE dataType = 0 ORDER BY ROWID DESC LIMIT 1`;
  const result = await queryClipboard(sql);
  return result.length > 0 ? result[0].item : '';
};

const count = parseInt(await arg('Enter the number of latest records to delete:'));
await deleteRecords(count);

const latestClipboard = await getLatestClipboard();
await clipboard.writeText(latestClipboard);

notify(`${count} records removed from clipboard history. OS clipboard updated.`);

db.close();
