// Name: Text Manipulation
// Description: Transform clipboard text based on user-selected options
// Shortcut: cmd+shift+c

import '@johnlindquist/kit';
import { CacheHelper } from '../lib/cache-helper';
import { Choice } from '../../../../.kit';

const xmlBeautifier = await npm('xml-beautifier');

const transformations = {
  upperCase: (text) => text.toUpperCase(),
  lowerCase: (text) => text.toLowerCase(),
  capitalize: (text) =>
    text
      .split('\n')
      .map((line) =>
        line
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
      )
      .join('\n'),
  snakeCase: (text) =>
    text
      .split('\n')
      .map((line) =>
        line
          .replace(/[\s-_]+(\w)/g, (_, p) => `_${p.toLowerCase()}`)
          .replace(/^[A-Z]/, (match) => match.toLowerCase()),
      )
      .join('\n'),
  camelCase: (text) =>
    text
      .split('\n')
      .map((line) =>
        line
          .replace(/[\s-_]+(\w)/g, (_, p) => p.toUpperCase())
          .replace(/^[A-Z]/, (match) => match.toLowerCase()),
      )
      .join('\n'),
  reverseCamelCase: (text) =>
    text
      .split('\n')
      .map((line) =>
        line
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .trim(),
      )
      .join('\n'),
  kebabCase: (text) =>
    text
      .split('\n')
      .map((line) =>
        line
          .replace(/[\s-_]+(\w)/g, (_, p) => `-${p.toLowerCase()}`)
          .replace(/^[A-Z]/, (match) => match.toLowerCase()),
      )
      .join('\n'),
  reverseCharacters: (text) =>
    text
      .split('\n')
      .map((line) => line.split('').reverse().join(''))
      .join('\n'),
  removeDuplicateLines: (text) => {
    const lines = text.split('\n');
    return [...new Set(lines)].join('\n');
  },
  keepOnlyDuplicateLines: (text) => {
    const lines = text.split('\n');
    const duplicates = lines.filter((item, index) => lines.indexOf(item) !== index);
    return [...new Set(duplicates)].join('\n');
  },
  removeEmptyLines: (text) =>
    text
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n'),
  removeAllNewLines: (text) =>
    text
      .split('\n')
      .map((line) => line.trim())
      .join(''),
  trimEachLine: (text) =>
    text
      .split('\n')
      .map((line) => line.trim())
      .join('\n'),
  sortLinesAlphabetically: (text) => text.split('\n').sort().join('\n'),
  sortLinesNumerically: (text) =>
    text
      .split('\n')
      .sort((a, b) => parseInt(a) - parseInt(b))
      .join('\n'),
  reverseLines: (text) => text.split('\n').reverse().join('\n'),
  shuffleLines: (text) => {
    const lines = text.split('\n');
    for (let i = lines.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = lines[i];
      lines[i] = lines[j];
      lines[j] = temp;
    }
    return lines.join('\n');
  },
  joinBy: (text, separator) => text.split('\n').join(separator),
  splitBy: (text, separator) => text.split(separator).join('\n'),
  removeWrapping: (text) => {
    const lines = text.split('\n');
    const matchingPairs = [
      ['(', ')'],
      ['[', ']'],
      ['{', '}'],
      ['<', '>'],
      ['"', '"'],
      ["'", "'"],
    ];
    const eolChars = [',', '.', ';'];

    return lines
      .map((line) => {
        const firstChar = line.charAt(0);
        let lastChar = line.charAt(line.length - 1);
        let adjustIndex = 0;

        // Check if there is an EOL character
        if (eolChars.includes(lastChar)) {
          lastChar = line.charAt(line.length - 2);
          adjustIndex = 1;
        }

        for (const [open, close] of matchingPairs) {
          if (firstChar === open && lastChar === close) {
            return line.slice(1, -1 - adjustIndex) + (adjustIndex ? line.slice(-1) : '');
          }
        }

        if (firstChar === lastChar) {
          return line.slice(1, -1 - adjustIndex) + (adjustIndex ? line.slice(-1) : '');
        }

        return line;
      })
      .join('\n');
  },
  wrapEachLine: (text, wrapper) => {
    const lines = text.split('\n');
    const eolChars = [',', '.', ';'];

    return lines
      .map((line) => {
        const lastChar = line.charAt(line.length - 1);
        const hasEOL = eolChars.includes(lastChar);

        if (hasEOL) {
          return `${wrapper}${line.slice(0, -1)}${wrapper}${lastChar}`;
        } else {
          return `${wrapper}${line}${wrapper}`;
        }
      })
      .join('\n');
  },
  captureEachLine: (text, regex) => {
    const lines = text.split('\n');
    const pattern = new RegExp(regex);

    return lines
      .map((line) => {
        const match = line.match(pattern);
        return match ? match[0] : '';
      })
      .join('\n');
  },
  removeLinesMatching: (text, regex) => {
    if (regex.length === 0) return text;
    const lines = text.split('\n');
    const pattern = new RegExp(regex, 'i');

    return lines.filter((line) => !pattern.test(line)).join('\n');
  },
  keepLinesMatching: (text, regex) => {
    if (regex.length === 0) return text;
    const lines = text.split('\n');
    const pattern = new RegExp(regex, 'i');

    return lines.filter((line) => pattern.test(line)).join('\n');
  },
  prependTextToAllLines: (text, prefix) => {
    const lines = text.split('\n');
    return lines.map((line) => prefix + line).join('\n');
  },

  appendTextToAllLines: (text, suffix) => {
    const lines = text.split('\n');
    return lines.map((line) => line + suffix).join('\n');
  },

  replaceRegexInAllLines: (text, regexWithReplacement) => {
    const [regex, replacement] = regexWithReplacement.split('|');
    const pattern = new RegExp(regex, 'g');
    const lines = text.split('\n');
    return lines.map((line) => line.replace(pattern, replacement)).join('\n');
  },
  removeRegexInAllLines: (text, regex) => {
    const pattern = new RegExp(regex, 'g');
    const lines = text.split('\n');
    return lines.map((line) => line.replace(pattern, '')).join('\n');
  },
  generateNumberedList: (text) => {
    const lines = text.split('\n');
    return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
  },
  base64Encode: (text) => Buffer.from(text).toString('base64'),
  finish: (text) => text,
  countLines: (text) => text.split('\n').length,
  countWords: (text) => text.trim().split(/\s+/).length,
  countCharacters: (text) => text.length,
  sumAllNumbers: (text) =>
    text
      .trim()
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => parseFloat(line.trim()))
      .reduce((total, num) => total + num, 0),
  base64Decode: (text) => Buffer.from(text, 'base64').toString('utf-8'),
  jsonPrettyPrint: (text) => JSON.stringify(JSON.parse(text), null, 2),
  jsonMinify: (text) => JSON.stringify(JSON.parse(text)),
  xmlPrettyPrint: (text) => xmlBeautifier(text),
  limitLines: (text, limit) => {
    let [limitNumber, offset] = limit.split(',');
    limitNumber = parseInt(limitNumber);
    offset = offset ? parseInt(offset) : 0;
    return text
      .split('\n')
      .slice(offset, offset + limitNumber)
      .join('\n');
  },
};

const options: Choice[] = [
  {
    name: 'Sum All Numbers',
    description: 'Sum all numbers in each line',
    value: {
      key: 'sumAllNumbers',
    },
  },
  {
    name: 'Upper Case',
    description: 'Transform the entire text to upper case',
    value: {
      key: 'upperCase',
    },
  },
  {
    name: 'Lower Case',
    description: 'Transform the entire text to lower case',
    value: {
      key: 'lowerCase',
    },
  },
  {
    name: 'snake_case',
    description: 'Convert text to snake_case',
    value: {
      key: 'snakeCase',
    },
  },
  {
    name: 'Capitalize',
    description: 'Convert text to Capital Case',
    value: {
      key: 'capitalize',
    },
  },
  {
    name: 'camelCase',
    description: 'Convert text to camelCase',
    value: {
      key: 'camelCase',
    },
  },
  {
    name: 'Reverse camelCase',
    description: 'Convert camelCase to Human readable',
    value: {
      key: 'reverseCamelCase',
    },
  },
  {
    name: 'kebab-case',
    description: 'Convert text to kebab-case',
    value: {
      key: 'kebabCase',
    },
  },
  {
    name: 'Reverse Characters',
    description: 'Reverse the characters in the text',
    value: {
      key: 'reverseCharacters',
    },
  },
  {
    name: 'Remove Duplicate Lines',
    description: 'Remove duplicate lines from the text',
    value: {
      key: 'removeDuplicateLines',
    },
  },
  {
    name: 'Keep Only Duplicate Lines',
    description: 'Keep only duplicate lines in the text',
    value: {
      key: 'keepOnlyDuplicateLines',
    },
  },
  {
    name: 'Remove Empty Lines',
    description: 'Remove empty lines from the text',
    value: {
      key: 'removeEmptyLines',
    },
  },
  {
    name: 'Remove All New Lines',
    description: 'Remove all new lines from the text',
    value: {
      key: 'removeAllNewLines',
    },
  },
  {
    name: 'Trim Each Line',
    description: 'Trim whitespace from the beginning and end of each line',
    value: {
      key: 'trimEachLine',
    },
  },
  {
    name: 'Sort Lines Alphabetically',
    description: 'Sort lines alphabetically',
    value: {
      key: 'sortLinesAlphabetically',
    },
  },
  {
    name: 'Sort Lines Numerically',
    description: 'Sort lines numerically',
    value: {
      key: 'sortLinesNumerically',
    },
  },
  {
    name: 'Reverse Lines',
    description: 'Reverse the order of lines',
    value: {
      key: 'reverseLines',
    },
  },
  {
    name: 'Shuffle Lines',
    description: 'Randomly shuffle the order of lines',
    value: {
      key: 'shuffleLines',
    },
  },
  {
    name: 'Join By',
    description: 'Join lines by a custom separator',
    value: {
      key: 'joinBy',
      parameter: {
        name: 'Separator',
        description: 'Enter a separator to join lines',
        defaultValue: ',',
      },
    },
  },
  {
    name: 'Split By',
    description: 'Split lines by a custom separator',
    value: {
      key: 'splitBy',
      parameter: {
        name: 'Separator',
        description: 'Enter a separator to split lines',
      },
    },
  },
  {
    name: 'Remove Wrapping',
    description: 'Remove wrapping characters from each line',
    value: {
      key: 'removeWrapping',
    },
  },
  {
    name: 'Wrap Each Line With',
    description: 'Wrap each line with a custom character or string',
    value: {
      key: 'wrapEachLine',
      parameter: {
        name: 'Wrapper',
        description: 'Enter a wrapper for each line',
        defaultValue: '"',
      },
    },
  },
  {
    name: 'Capture Each Line',
    description: 'Capture and return the first match of a regex pattern in each line',
    value: {
      key: 'captureEachLine',
      parameter: {
        name: 'Pattern',
        description: 'Enter a regex pattern to capture',
        defaultValue: '.+',
      },
    },
  },
  {
    name: 'Remove / Filter out Lines Matching',
    description: 'Remove lines that match the given regex',
    value: {
      key: 'removeLinesMatching',
      parameter: {
        name: 'Regex',
        description: 'Enter a regex to match lines to remove',
        defaultValue: '',
      },
    },
  },
  {
    name: 'Keep / Filter in Lines Matching',
    description: 'Keep lines that match the given regex',
    value: {
      key: 'keepLinesMatching',
      parameter: {
        name: 'Regex',
        description: 'Enter a regex to match lines to keep',
        defaultValue: '.+',
      },
    },
  },
  {
    name: 'Prepend Text to All Lines',
    description: 'Add text to the beginning of all lines',
    value: {
      key: 'prependTextToAllLines',
      parameter: {
        name: 'Text',
        description: 'Enter text to prepend to all lines',
        defaultValue: '',
      },
    },
  },
  {
    name: 'Append Text to All Lines',
    description: 'Add text to the end of all lines',
    value: {
      key: 'appendTextToAllLines',
      parameter: {
        name: 'Text',
        description: 'Enter text to append to all lines',
        defaultValue: '',
      },
    },
  },
  {
    name: 'Replace Regex in All Lines',
    description: 'Replace regex matches in all lines with specified text',
    value: {
      key: 'replaceRegexInAllLines',
      parameter: {
        name: 'Regex and Replacement',
        description: "Enter regex and replacement text separated by a '|'",
        defaultValue: '(.+)|$1',
      },
    },
  },
  {
    name: 'Remove Regex In All Lines',
    description: 'Remove matches of the provided regex in all lines',
    value: {
      key: 'removeRegexInAllLines',
      parameter: {
        name: 'Regex',
        description: 'Enter a regex to remove from all lines',
        defaultValue: '',
      },
    },
  },
  {
    name: 'Generate Numbered List',
    description: 'Prepend numbers to each line',
    value: {
      key: 'generateNumberedList',
    },
  },
  {
    name: 'Base64 Encode',
    description: 'Encode text using Base64',
    value: {
      key: 'base64Encode',
    },
  },
  {
    name: 'Base64 Decode',
    description: 'Decode text using Base64',
    value: {
      key: 'base64Decode',
    },
  },
  {
    name: 'Count Lines',
    description: 'Count the number of lines',
    value: {
      key: 'countLines',
    },
  },
  {
    name: 'Count Words',
    description: 'Count the number of words',
    value: {
      key: 'countWords',
    },
  },
  {
    name: 'Count Characters',
    description: 'Count the number of characters',
    value: {
      key: 'countCharacters',
    },
  },
  {
    name: 'JSON Pretty Print',
    description: 'Formats JSON strings for better readability',
    value: { key: 'jsonPrettyPrint' },
  },
  {
    name: 'JSON Minify',
    description: 'Minifies JSON String',
    value: { key: 'jsonMinify' },
  },
  {
    name: 'XML Pretty Print',
    description: 'Formats XML strings for better readability',
    value: { key: 'xmlPrettyPrint' },
  },
  {
    name: 'Limit Lines',
    description: 'Limit the number of lines, similar to SQL limits',
    value: {
      key: 'limitLines',
      parameter: {
        name: 'Regex and Replacement',
        description: 'Enter a limit number of lines, comma to specify offset',
        defaultValue: '10',
      },
    },
  },
];

const operationOptions: Choice[] = [
  {
    name: 'Select or Type a Transformation to Perform',
    disableSubmit: true,
    value: {
      key: 'init',
    },
  },
  {
    name: 'Perform Last Transformations',
    value: {
      key: 'last',
    },
  },
  {
    name: 'Perform Transformations',
    description: 'Perform transformations on the text and copy to clipboard',
    value: {
      key: 'finish',
    },
  },
  {
    name: 'Save Transformations',
    description: 'Save the current transformations under a custom name',
    value: { key: 'save' },
  },
  {
    name: 'List Saved Transformations',
    description: 'List and execute saved transformation combos',
    value: {
      key: 'listSaved',
    },
  },
  {
    name: 'Extract with JQ',
    description: 'Extract data from JSON using JQ',
    value: {
      key: 'jq',
    },
  },
];

const handleTransformation = async (text, transformation) => {
  const { key, parameter } = transformation;
  const paramValue = parameter
    ? await arg(
        {
          input: parameter.defaultValue,
        },
        (input) => {
          try {
            return md(`<pre>${transformations[key](text, input)}</pre>`);
          } catch (e) {
            return md(`<pre>${text}</pre>`);
          }
        },
      )
    : null;
  return {
    text: transformations[key](text, paramValue),
    name: key,
    paramValue,
  };
};

let clipboardText = await clipboard.readText();
let operations: { name: string; params: unknown[] }[] = [];

// Cache setup
const cache = await new CacheHelper('text-manipulation', 'never').init();
let last = cache.get('last') ?? [];
const persisted = cache.get('persisted') ?? {};
const usage = cache.get('usage') ?? {};
const timestamps = cache.get('timestamps') ?? {};

// jq script ref
const jqScript = (await getScripts()).find(
  (s) => s.kenv === 'script-kit-kenv' && s.command === 'extract-with-jq',
);

const runAllTransformations = (all) => {
  return all.reduce((prev, curr) => {
    return transformations[curr.name].apply(null, [prev, ...curr.params]);
  }, clipboardText);
};

// eslint-disable-next-line no-constant-condition
loop: while (true) {
  const transformation = await arg(
    {
      placeholder: 'Choose a text transformation',
      hint: operations.map((o) => o.name).join(' > '),
    },
    [...operationOptions, ...options]
      .map((option) => {
        // hide init if there are already operations
        if (option.value.key === 'init' && operations.length) return null;
        //last transformation if not available
        if (option.value.key === 'last' && (!last.length || operations.length)) return null;
        //hide finish if no operations yet
        if (option.value.key === 'finish' && !operations.length) return null;
        //hide save if no operations yet
        if (option.value.key === 'save' && !operations.length) return null;
        //hide listSaved if no saved transformations yet
        if (option.value.key === 'listSaved' && Object.keys(persisted).length === 0) return null;

        //show last transformation names in description
        if (option.value.key === 'last') {
          option.description = last.map((o) => o.name).join(' > ');
        }

        if (option.value.key === 'jq') {
          try {
            JSON.parse(clipboardText);
          } catch (e) {
            return null;
          }
        }

        return option;
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.value.key === 'init') return -1;
        if (b.value.key === 'init') return 1;

        if (a.value.key === 'last') return -1;
        if (b.value.key === 'last') return 1;

        if (a.value.key === 'finish') return -1;
        if (b.value.key === 'finish') return 1;

        if (a.value.key === 'save') return -1;
        if (b.value.key === 'save') return 1;

        if (a.value.key === 'listSaved') return -1;
        if (b.value.key === 'listSaved') return 1;

        if (a.value.key === 'jq') return -1;
        if (b.value.key === 'jq') return 1;

        const now = Date.now();
        const timeDecay = 3600 * 24 * 7 * 1000; // Time decay in milliseconds (e.g., 1 week)

        const aCount = usage[a.value.key] || 0;
        const bCount = usage[b.value.key] || 0;

        const aTimestamp = timestamps[a.value.key] || now;
        const bTimestamp = timestamps[b.value.key] || now;

        const aDecayedCount = aCount * Math.exp(-(now - aTimestamp) / timeDecay);
        const bDecayedCount = bCount * Math.exp(-(now - bTimestamp) / timeDecay);

        return bDecayedCount - aDecayedCount;
      })
      .map((option) => {
        return {
          ...option,
          preview: () => {
            try {
              if (option.value.key === 'last')
                return md(`<pre>${runAllTransformations(last)}</pre>`);
              if (option.value['parameter']) throw '';
              return md(`<pre>${transformations[option.value.key](clipboardText)}</pre>`);
            } catch (e) {
              return md(`<pre>${clipboardText}</pre>`);
            }
          },
        };
      }),
  );

  switch (transformation.key) {
    case 'finish':
      break loop;
    case 'last':
      clipboardText = runAllTransformations(last);
      operations = [...last];

      //remove last transformations from local memory
      //it is still persisted and will be updated if new transformations are applied
      last = [];
      break;
    case 'save': {
      const transformationName = await arg('Enter a name for this transformations:');

      persisted[transformations.camelCase(transformationName)] = operations;
      await cache.store('persisted', persisted);
      break loop;
    }
    case 'listSaved': {
      const flags = { delete: { name: 'Delete', shortcut: 'cmd+enter' } };
      const savedTransformationName = await arg(
        {
          placeholder: 'Select a saved transformation to apply:',
          flags,
        },
        Object.keys(persisted).map((name) => {
          return {
            name: transformations.reverseCamelCase(name),
            value: name,
          };
        }),
      );
      if (flag.delete) {
        const value = await arg('Are you sure you want to delete this transformation?', [
          'yes',
          'no',
        ]);
        if (value === 'yes') {
          delete persisted[savedTransformationName];
          await cache.store('persisted', persisted);
          notify(`Transformation ${savedTransformationName} deleted`);
        }
      } else {
        const savedTransformation = persisted[savedTransformationName];
        clipboardText = runAllTransformations(savedTransformation);
        operations = [...savedTransformation];
        last = [];
      }
      break;
    }
    case 'jq':
      await run(jqScript.filePath);
      exit();
      break;
    default: {
      const result = await handleTransformation(clipboardText, transformation);
      clipboardText = result.text;

      //save operations
      operations.push({ name: result.name, params: [result.paramValue] });

      //store usage for sorting
      usage[transformation.key] = (usage[transformation.key] || 0) + 1;
      timestamps[transformation.key] = Date.now();
      await cache.store('usage', usage);
      await cache.store('timestamps', timestamps);
    }
  }
}

//store last transformations
last = operations;
await cache.store('last', last);

await clipboard.writeText(clipboardText.toString());

notify('Text transformation applied and copied to clipboard');
