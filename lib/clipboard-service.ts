await npm('better-sqlite3');

import '@johnlindquist/kit';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { getEnv } from './env-helper';

type ClipboardItem = {
  ROWID: number;
  item: string;
  ts: number;
  app: string;
  apppath: string;
  dataType: number;
};

type ClipboardItemTypes = ClipboardItem[keyof ClipboardItem];

export class ClipboardService {
  private db: DatabaseType;

  constructor() {
    const databasePath = getEnv('ALFRED_DATABASE_PATH');
    this.db = new Database(databasePath);
  }

  getLatest(count: number) {
    const sql = `SELECT ROWID, *
                     FROM clipboard
                     WHERE dataType = 0
                     order by ROWID desc
                     LIMIT ?`;
    return this.db.prepare(sql).all(count) as ClipboardItem[];
  }

  deleteLatest(count: number) {
    const sql = `DELETE
                     FROM clipboard
                     WHERE ROWID IN (SELECT ROWID
                                     FROM clipboard
                                     WHERE dataType = 0
                                     ORDER BY ROWID DESC
                                     LIMIT ?)`;

    return this.db.prepare(sql).run(count);
  }

  raw(sql: string, params: ClipboardItemTypes[] = []) {
    const stmt = this.db.prepare(sql);
    return sql.trim().toUpperCase().startsWith('SELECT')
      ? (stmt.all(params) as ClipboardItemTypes[])
      : stmt.run(params);
  }

  close() {
    this.db.close();
  }
}
