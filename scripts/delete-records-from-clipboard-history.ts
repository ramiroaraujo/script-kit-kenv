// Name: Delete Records from Clipboard History
// Description: Remove the specified number of latest records from the clipboard history and update the OS clipboard with the next latest item.

import '@johnlindquist/kit';

const Database = await npm('better-sqlite3');
const databasePath = home('Library/Application Support/Alfred/Databases/clipboard.alfdb');
const db = new Database(databasePath);
if (!(await pathExists(databasePath))) {
  notify('Alfred clipboard database not found');
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
