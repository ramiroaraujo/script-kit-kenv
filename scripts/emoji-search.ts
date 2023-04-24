// Name: Emoji Search
// Description: Search and copy emoji to clipboard using SQLite database

import "@johnlindquist/kit"

const Database = await npm("better-sqlite3")
const dbPath = kenvPath("kenvs", "ramiro", "db", "emoji-search-emojilib.db")
const db = new Database(dbPath)

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
