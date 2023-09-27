// Name: Merge / Split Alfred Clipboard
// Description: Merge or split clipboard content using Alfred app's clipboard

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

const queryClipboard = async (sql, params) => {
  const stmt = db.prepare(sql);
  return sql.trim().toUpperCase().startsWith('SELECT') ? stmt.all(params) : stmt.run(params);
};

const getMergedClipboards = async (count, separator) => {
  const sql = `SELECT item
                 FROM clipboard
                 WHERE dataType = 0
                 order by ROWID desc LIMIT ?`;
  const clipboards = await queryClipboard(sql, [count]);
  if (separator === '\\n') separator = '\n';
  return clipboards.map((row) => row.item.trim()).join(separator);
};

const writeMergedClipboards = async (mergedText) => {
  await clipboard.writeText(mergedText);
};

const getSplitClipboard = async (separator, trim) => {
  const currentClipboard = await clipboard.readText();
  return currentClipboard.split(separator).map((item) => (trim ? item.trim() : item));
};

const writeSplitClipboard = async (splitText) => {
  const lastTsSql = `SELECT ts
                       FROM clipboard
                       WHERE dataType = 0
                       ORDER BY ts DESC LIMIT 1`;
  const lastTsResult = await queryClipboard(lastTsSql, []);
  let lastTs = lastTsResult.length > 0 ? Number(lastTsResult[0].ts) : 0;

  const insertSql = `INSERT INTO clipboard (item, ts, dataType, app, appPath)
                       VALUES (?, ?, 0, 'Kit', '/Applications/Kit.app')`;

  for (let i = 0; i < splitText.length - 1; i++) {
    lastTs += 1;
    await queryClipboard(insertSql, [splitText[i], lastTs]);
  }

  await clipboard.writeText(splitText[splitText.length - 1]);
};

const action = await arg('Choose action', ['Merge', 'Split']);

if (action === 'Merge') {
  const count = await arg(
    {
      placeholder: 'Enter the number of clipboard items to merge',
    },
    async (input) => {
      if (isNaN(Number(input)) || input.length === 0) return '';
      return md(`<pre>${await getMergedClipboards(input, '\n')}</pre>`);
    },
  );
  const separator = await arg(
    {
      placeholder: 'Enter the separator for merging',
    },
    async (input) => {
      return md(`<pre>${await getMergedClipboards(count, input)}</pre>`);
    },
  );
  const mergedText = await getMergedClipboards(count, separator);
  await writeMergedClipboards(mergedText);
  notify('Merged clipboard items and copied to clipboard');
} else if (action === 'Split') {
  // const separator = await arg("Enter the separator for splitting");
  const separator = await arg(
    {
      placeholder: 'Enter the separator for splitting',
    },
    async (input) => {
      if (input === '\\n') input = '\n';
      const strings = await getSplitClipboard(input, true);
      return md(`<pre>${strings.join('\n')}</pre>`);
    },
  );
  const trim = await arg('Trim clipboard content?', ['Yes', 'No']);
  const splitText = await getSplitClipboard(separator, trim === 'Yes');
  await writeSplitClipboard(splitText);
  notify('Split clipboard content and stored in Alfred clipboard');
}

db.close();
