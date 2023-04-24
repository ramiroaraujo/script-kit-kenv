import json
import sqlite3
import requests

url = "https://raw.githubusercontent.com/muan/emojilib/main/dist/emoji-en-US.json"
response = requests.get(url)
emoji_data = response.json()

conn = sqlite3.connect('../db/emoji-search-emojilib.db')
c = conn.cursor()

c.execute('''CREATE TABLE IF NOT EXISTS emojis
             (emoji TEXT PRIMARY KEY, name TEXT, keywords TEXT, used INTEGER DEFAULT 0)''')

for emoji_char, emoji_info in emoji_data.items():
    description = emoji_info[0]
    tags = ', '.join(emoji_info[1:])

    c.execute("INSERT OR REPLACE INTO emojis VALUES (?, ?, ?)",
              (emoji_char, description, tags))

conn.commit()
conn.close()
