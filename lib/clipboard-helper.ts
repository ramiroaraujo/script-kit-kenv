await npm('sqlite');

import '@johnlindquist/kit';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { getEnv } from './env-helper';

let db;
try {
  const databasePath = getEnv('ALFRED_DATABASE_PATH');
  db = await open({ filename: databasePath, driver: sqlite3.Database });
} catch (e) {
  notify({
    title: 'Clipboard history database not found',
    message: 'Try looking in Alfred pref -> Advanced -> Reveal in Finder',
  });
  exit();
}

export const queryClipboard = async (sql, params) => {
  return sql.trim().toUpperCase().startsWith('SELECT')
    ? await db.all(sql, params)
    : await db.run(sql, params);
};

export const closeConnection = async () => {
  await db.close();
};
