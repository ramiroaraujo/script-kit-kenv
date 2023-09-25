// Name: ff sort terraform alphabetically

import '@johnlindquist/kit';

const matchers = [
  {
    regex: /env \{[\s\S]*?\}/g,
    sort: (a, b) => {
      const nameA = a.match(/name\s+=\s+"(.+)"/)[1];
      const nameB = b.match(/name\s+=\s+"(.+)"/)[1];
      return nameA.localeCompare(nameB);
    },
  },
  {
    regex: /data\s+"([^"]+)"\s+"([^"]+)"\s+\{([\s\S]*?)\}/g,
    sort: (a, b) => {
      const strA = a.match(/data\s+"[^"]+"\s+"([^"]+)"/)[1];
      const strB = b.match(/data\s+"[^"]+"\s+"([^"]+)"/)[1];
      return strA.localeCompare(strB);
    },
  },
];

const text = await clipboard.readText();

let results = [];
for (const matcher of matchers) {
  const matches = text.match(matcher.regex);
  if (!matches) continue;
  results = results.concat(matches.map((match) => match.trim()).sort(matcher.sort));
}

const sorted = results.join('\n\n');

await clipboard.writeText(sorted);
