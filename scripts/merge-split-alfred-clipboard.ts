// Name: Merge / Split Alfred clipboard
// Description: Merge or split clipboard content using Alfred app's clipboard

import "@johnlindquist/kit"

const Database = await npm("better-sqlite3");
const path = "/Users/ramiroaraujo/Library/Application Support/Alfred/Databases/clipboard.alfdb";
const db = new Database(path);

const queryClipboard = async (sql, params) => {
    const stmt = db.prepare(sql);
    return sql.trim().toUpperCase().startsWith("SELECT") ? stmt.all(params) : stmt.run(params);
};

const mergeClipboards = async (count, separator) => {
    const sql = `SELECT item FROM clipboard WHERE dataType = 0 order by ROWID desc LIMIT ?`;
    const clipboards = await queryClipboard(sql, [count]);
    const mergedText = clipboards.map(row => row.item.trim()).join(separator);
    await clipboard.writeText(mergedText);
};

const splitClipboard = async (separator, trim) => {
    const currentClipboard = await clipboard.readText();
    const splitText = currentClipboard.split(separator).map(item => trim ? item.trim() : item);

    const lastTsSql = `SELECT ts FROM clipboard WHERE dataType = 0 ORDER BY ts DESC LIMIT 1`;
    const lastTsResult = await queryClipboard(lastTsSql, []);
    let lastTs = lastTsResult.length > 0 ? Number(lastTsResult[0].ts) : 0;

    const insertSql = `INSERT INTO clipboard (item, ts, dataType, app, appPath) VALUES (?, ?, 0, 'Kit', '/Applications/Kit.app')`;

    for (let i = 0; i < splitText.length - 1; i++) {
        lastTs += 1;
        await queryClipboard(insertSql, [splitText[i], lastTs]);
    }

    await clipboard.writeText(splitText[splitText.length - 1]);
};

const action = await arg("Choose action", ["Merge", "Split"]);

if (action === "Merge") {
    const count = await arg("Enter the number of clipboard items to merge" );
    const separator = await arg("Enter the separator for merging");
    await mergeClipboards(count, separator);
    await notify("Merged clipboard items and copied to clipboard");
} else {
    const separator = await arg("Enter the separator for splitting");
    const trim = await arg("Trim clipboard content?", ["Yes", "No"]);
    await splitClipboard(separator, trim === "Yes");
    await notify("Split clipboard content and stored in Alfred clipboard");
}

db.close();

