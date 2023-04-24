// Name: Emoji Search
// Description: Search and copy emoji to clipboard using SQLite database

import "@johnlindquist/kit"

const Database = await npm("better-sqlite3")
const databaseFile = projectPath("db", "emoji-search-emojilib.db")

const emojilibURL = "https://raw.githubusercontent.com/muan/emojilib/main/dist/emoji-en-US.json"

const createDatabase = async () => {
    const response = await get(emojilibURL)
    const emojiData = response.data as Record<string, string[]>

    //create db and table
    const db = new Database(databaseFile)
    db.exec(`CREATE TABLE IF NOT EXISTS emojis
           (emoji TEXT PRIMARY KEY, name TEXT, keywords TEXT, used INTEGER DEFAULT 0)`)

    //populate with data from emojilib
    for (const [emojiChar, emojiInfo] of Object.entries(emojiData)) {
        const description = emojiInfo[0]
        const tags = emojiInfo.slice(1).join(', ')

        db.prepare("INSERT OR REPLACE INTO emojis VALUES (?, ?, ?, 0)").run(emojiChar, description, tags)
    }
    db.close()
};

if (!await pathExists(databaseFile)) {
    await createDatabase()
}

const db = new Database(databaseFile)

const queryEmojis = async () => {
    const sql = "SELECT emoji, name, keywords FROM emojis ORDER BY used DESC"
    const stmt = db.prepare(sql)
    return stmt.all()
}

const snakeToHuman = (text) => {
    return text
        .split('_')
        .map((word, index) => index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)
        .join(' ')
}

const emojis = await queryEmojis()

const selectedEmoji = await arg("Search Emoji", emojis.map(({ emoji, name, keywords }) => ({
    name: `${snakeToHuman(name)} ${keywords}`,
    html: md(`<div class="flex items-center">
            <span class="text-5xl">${emoji}</span>
            <div class="flex flex-col ml-2">
                <span class="text-2xl" style="color: lightgrey">${snakeToHuman(name)}</span>
                <small style="color: darkgrey">${keywords}</small>       
            </div>
        </div>`),
    value: emoji,

})))

await clipboard.writeText(selectedEmoji)

// Update the 'used' count
const updateSql = "UPDATE emojis SET used = used + 1 WHERE emoji = ?"
const updateStmt = db.prepare(updateSql)
updateStmt.run(selectedEmoji)

db.close()
