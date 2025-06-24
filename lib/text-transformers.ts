import { Transformation } from '../scripts/text-manipulation';

const Mexp = await npm('math-expression-evaluator');

export const transformations: Transformation[] = [
  {
    option: {
      name: 'Wrap Text',
      description: 'Wrap text to specified width',
      value: {
        key: 'wrapText',
        parameter: {
          name: 'Width',
          description: 'Enter maximum line width (default: 80)',
          defaultValue: '80',
        },
      },
    },
    function: async (text, width = '80') => {
      const maxWidth = parseInt(width);
      return text
        .split('\n')
        .map((line) => {
          const words = line.split(' ');
          const lines = [];
          let currentLine = '';

          words.forEach((word) => {
            if ((currentLine + word).length > maxWidth) {
              if (currentLine) lines.push(currentLine.trim());
              currentLine = word;
            } else {
              currentLine += (currentLine ? ' ' : '') + word;
            }
          });

          if (currentLine) lines.push(currentLine.trim());
          return lines.join('\n');
        })
        .join('\n');
    },
  },
  // url decode
  {
    option: {
      name: 'URL Decode',
      description: 'Decode URL encoded text',
      value: { key: 'urlDecode' },
    },
    function: async (text) => decodeURIComponent(text),
  },
  {
    option: {
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
    function: async (text, suffix) =>
      text
        .split('\n')
        .map((line) => line + suffix)
        .join('\n'),
  },
  {
    option: {
      name: 'Append from Clipboard',
      description: 'Search and append text from clipboard to all lines',
      value: {
        key: 'appendFromClipboard',
        parameter: {
          name: 'clipboardSearch',
          description: 'Search clipboard for text to append',
          type: 'clipboard-search',
        },
      },
    },
    function: async (text, suffix) =>
      text
        .split('\n')
        .map((line) => line + suffix)
        .join('\n'),
  },
  {
    option: {
      name: 'Base64 Decode',
      description: 'Decode text using Base64',
      value: { key: 'base64Decode' },
    },
    function: async (text) => Buffer.from(text, 'base64').toString('utf-8'),
  },
  {
    option: {
      name: 'Base64 Encode',
      description: 'Encode text using Base64',
      value: { key: 'base64Encode' },
    },
    function: async (text) => Buffer.from(text).toString('base64'),
  },
  {
    option: {
      name: 'camelCase',
      description: 'Convert text to camelCase',
      value: { key: 'camelCase' },
    },
    function: async (text) =>
      text
        .split('\n')
        .map((line) =>
          line
            .replace(/[\s-_]+(\w)/g, (_, p) => p.toUpperCase())
            .replace(/^[A-Z]/, (match) => match.toLowerCase()),
        )
        .join('\n'),
  },
  {
    option: {
      name: 'Capitalize / TitleCase',
      description: 'Convert text to Capital Case',
      value: { key: 'capitalize' },
    },
    function: async (text) =>
      text
        .split('\n')
        .map((line) =>
          line
            .split(' ')
            .map((word, idx, arr) => {
              if (
                idx === 0 ||
                idx === arr.length - 1 ||
                ![
                  'and',
                  'or',
                  'the',
                  'of',
                  'in',
                  'to',
                  'for',
                  'with',
                  'on',
                  'at',
                  'from',
                  'by',
                  'about',
                  'as',
                ].includes(word.toLowerCase())
              ) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
              } else {
                return word.toLowerCase();
              }
            })
            .join(' '),
        )
        .join('\n'),
  },
  {
    option: {
      name: 'Capture Each Line',
      description: 'Capture and return the first match of a regex pattern in each line',
      value: {
        key: 'captureEachLine',
        parameter: {
          name: 'Pattern',
          description: 'Enter a regex pattern to capture',
          defaultValue: '',
        },
      },
    },
    function: async (text, regex) => {
      if (regex.length === 0) return text;
      const pattern = new RegExp(regex);
      return text
        .split('\n')
        .map((line) => {
          const match = line.match(pattern);
          return match ? match[0] : '';
        })
        .join('\n');
    },
  },
  {
    option: {
      name: 'Convert numbers to integers',
      description: 'convert numbers in all lines to integers',
      value: {
        key: 'convertToIntegers',
      },
    },
    function: async (text) =>
      text
        .split('\n')
        .map((line) => {
          const num = parseInt(line);
          return isNaN(num) ? line : num;
        })
        .join('\n'),
  },
  {
    option: {
      name: 'Convert to CSV / TSV',
      description: 'Convert the text to Comma or Tab separated values',
      value: {
        key: 'convertToTSV',
        parameter: [
          {
            name: 'Columns',
            description: 'Enter the number of columns to split by',
            defaultValue: '2',
          },
          {
            name: 'Separator',
            description: 'Enter the separator to use, default is comma',
            defaultValue: ',',
          },
        ],
      },
    },
    function: async (text, columns, separator = ',') => {
      if (separator === '\\t') separator = '\t';
      return text
        .split('\n')
        .reduce((acc, line, index) => {
          const col = Math.floor(index / parseInt(columns));
          if (!acc[col]) acc[col] = [];
          acc[col].push(line);
          return acc;
        }, [])
        .map((row) => row.join(separator))
        .join('\n');
    },
  },
  {
    option: {
      name: 'Count Characters',
      description: 'Count the number of characters',
      value: { key: 'countCharacters' },
    },
    function: async (text) => text.length,
  },
  {
    option: {
      name: 'Count Lines',
      description: 'Count the number of lines',
      value: { key: 'countLines' },
    },
    function: async (text) => text.split('\n').length,
  },
  {
    option: {
      name: 'Count Words',
      description: 'Count the number of words',
      value: { key: 'countWords' },
    },
    function: async (text) => text.trim().split(/\s+/).length,
  },
  {
    option: {
      name: 'Extract all numbers',
      description: 'Extract all numbers from all lines',
      value: {
        key: 'extractAllNumbers',
      },
    },
    function: async (text) =>
      text
        .split('\n')
        .map((line) => {
          const numbers: string[] = line.match(/-?\d+(\.\d+)?/g) || [];
          return numbers.map((n) => parseFloat(n));
        })
        .flat()
        .join('\n'),
  },
  {
    option: {
      name: 'Extract URLs',
      description: 'Extract and normalize URLs from text',
      value: { key: 'extractUrls' },
    },
    function: async (text) =>
      text
        .split('\n')
        .map((line) => {
          const urls = line.match(/https?:\/\/[^\s,\])}'"]+/g) || [];
          const incompleteUrls = (
            line.match(/(?:www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+[^\s,\])}'"]*/g) || []
          ).map((url) => `https://${url}`);
          return [...urls, ...incompleteUrls];
        })
        .flat()
        .map((url) => url.toLowerCase())
        .filter((url, index, array) => array.indexOf(url) === index)
        .join('\n'),
  },
  {
    option: {
      name: 'Extract / Convert Formatted Number to Plain Number',
      description:
        'Extract and auto-detect formatted number (optional currencies) and convert to plain number',
      value: { key: 'convertFormattedNumber' },
    },
    function: async (text) => {
      return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '')
        .map((line) => {
          const sanitizedText = line.replace(/\s*(us\s?\$|ar\s?\$|\$)/gi, '').trim();
          const hasComma = sanitizedText.includes(',');
          const hasDot = sanitizedText.includes('.');
          if (!hasComma && !hasDot) {
            return parseFloat(sanitizedText);
          }
          if (hasComma && !hasDot) {
            return parseFloat(sanitizedText.replace(',', '.'));
          }
          if (!hasComma && hasDot) {
            return parseFloat(sanitizedText);
          }
          if (hasComma && hasDot) {
            const commaIndex = sanitizedText.indexOf(',');
            const dotIndex = sanitizedText.indexOf('.');
            if (commaIndex < dotIndex) {
              return parseFloat(sanitizedText.replace(',', '').replace('.', '.'));
            } else {
              return parseFloat(sanitizedText.replace('.', '').replace(',', '.'));
            }
          }
          return line;
        })
        .join('\n');
    },
  },
  {
    option: {
      name: 'Filter Value by Key',
      description: 'Given a text of key-value pairs, filter by key',
      value: {
        key: 'filterValueByKey',
        parameter: {
          name: 'Key',
          description: 'Enter a key to filter by',
          defaultValue: '',
        },
      },
    },
    function: async (text, filter) => {
      if (filter.length < 3) return text;
      const index = text.toLowerCase().indexOf(filter.toLowerCase());
      if (index === -1) return text;
      const matchedLine = text.slice(index, text.length).split('\n')[0];
      const value = matchedLine
        .match(/(?::|=>|->)(.+)/)[1]
        ?.trim()
        .replace(/^(['"`])(.+?)\1.*[,;]*/g, '$2');
      return value ?? text;
    },
  },
  {
    option: {
      name: 'Generate Numbered List',
      description: 'Prepend numbers to each line',
      value: { key: 'generateNumberedList' },
    },
    function: async (text) =>
      text
        .split('\n')
        .map((line, index) => `${index + 1}. ${line}`)
        .join('\n'),
  },
  {
    option: {
      name: 'Javascript Object to JSON',
      description: 'Convert regular valid object to JSON',
      value: { key: 'convertObjectToJSON' },
    },
    function: async (text) => {
      try {
        const evaluated = eval(`(${text})`);
        return JSON.stringify(evaluated, null, 2);
      } catch (e) {
        return text;
      }
    },
  },
  {
    option: {
      name: 'Join By',
      description: 'Join lines by a custom separator',
      value: {
        key: 'joinBy',
        parameter: {
          name: 'Separator',
          description: 'Enter a separator to join lines',
          defaultValue: ', ',
        },
      },
    },
    function: async (text, separator) => text.split('\n').join(separator),
  },
  {
    option: {
      name: 'JSON Minify',
      description: 'Minifies JSON String',
      value: { key: 'jsonMinify' },
    },
    function: async (text) => JSON.stringify(JSON.parse(text)),
  },
  {
    option: {
      name: 'JSON Pretty Print',
      description: 'Formats JSON strings for better readability',
      value: { key: 'jsonPrettyPrint' },
    },
    function: async (text) => JSON.stringify(JSON.parse(text), null, 2),
  },
  {
    option: {
      name: 'kebab-case / hyphen-case',
      description: 'Convert text to kebab-case / hyphen-case',
      value: { key: 'kebabCase' },
    },
    function: async (text) =>
      text
        .split('\n')
        .map((line) =>
          line
            .replace(/[\s-_]+(\w)/g, (_, p) => `-${p.toLowerCase()}`)
            .replace(/^[A-Z]/, (match) => match.toLowerCase()),
        )
        .join('\n'),
  },
  {
    option: {
      name: 'Keep / Filter in Lines Matching',
      description: 'Keep lines that match the given regex',
      value: {
        key: 'keepLinesMatching',
        parameter: {
          name: 'Regex',
          description: 'Enter a regex to match lines to keep',
          defaultValue: '',
        },
      },
    },
    function: async (text, regex) => {
      if (regex.length === 0) return text;
      const pattern = new RegExp(regex, 'i');
      return text
        .split('\n')
        .filter((line) => pattern.test(line))
        .join('\n');
    },
  },
  {
    option: {
      name: 'Keep Only Duplicate Lines',
      description: 'Keep only duplicate lines in the text',
      value: { key: 'keepOnlyDuplicateLines' },
    },
    function: async (text) => {
      const lines = text.split('\n');
      const duplicates = lines.filter((item, index) => lines.indexOf(item) !== index);
      return [...new Set(duplicates)].join('\n');
    },
  },
  {
    option: {
      name: 'Limit Lines',
      description: 'Limit the number of lines, similar to SQL limits',
      value: {
        key: 'limitLines',
        parameter: [
          {
            name: 'Limit',
            description: 'Enter a limit number of lines',
            defaultValue: '5',
          },
          {
            name: 'Offset',
            description: 'Enter an optional offset',
            defaultValue: '0',
          },
        ],
      },
    },
    function: async (text, limit, offset = '0') => {
      const offsetNumber = parseInt(offset);
      const limitNumber = parseInt(limit);
      return text
        .split('\n')
        .slice(offsetNumber, offsetNumber + limitNumber)
        .join('\n');
    },
  },
  {
    option: {
      name: 'Lower Case',
      description: 'Transform the entire text to lower case',
      value: { key: 'lowerCase' },
    },
    function: async (text) => text.toLowerCase(),
  },
  {
    option: {
      name: 'Math Expression',
      description: 'Evaluate each line as a math expression',
      value: {
        key: 'mathExpression',
        parameter: {
          name: 'Expression',
          description: 'Enter a math expression to evaluate, use {number} as a placeholder',
          defaultValue: '{number} ',
        },
      },
    },
    function: async (text, expression) =>
      text
        .split('\n')
        .map((line) => {
          try {
            const mexp = new Mexp();
            return mexp.eval(expression.replace('{number}', line.trim()));
          } catch (e) {
            return line;
          }
        })
        .join('\n'),
  },
  {
    option: {
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
    function: async (text, prefix) =>
      text
        .split('\n')
        .map((line) => prefix + line)
        .join('\n'),
  },
  {
    option: {
      name: 'Prepend from Clipboard',
      description: 'Search and prepend text from clipboard to all lines',
      value: {
        key: 'prependFromClipboard',
        parameter: {
          name: 'clipboardSearch',
          description: 'Search clipboard for text to prepend',
          type: 'clipboard-search',
        },
      },
    },
    function: async (text, prefix) =>
      text
        .split('\n')
        .map((line) => prefix + line)
        .join('\n'),
  },
  {
    option: {
      name: 'Remove All New Lines',
      description: 'Remove all new lines from the text',
      value: { key: 'removeAllNewLines' },
    },
    function: async (text) =>
      text
        .split('\n')
        .map((line) => line.trim())
        .join(''),
  },
  {
    option: {
      name: 'Remove Duplicate Lines',
      description: 'Remove duplicate lines from the text',
      value: { key: 'removeDuplicateLines' },
    },
    function: async (text) => {
      const lines = text.split('\n');
      return [...new Set(lines)].join('\n');
    },
  },
  {
    option: {
      name: 'Remove Empty Lines',
      description: 'Remove empty lines from the text',
      value: { key: 'removeEmptyLines' },
    },
    function: async (text) =>
      text
        .split('\n')
        .filter((line) => line.trim() !== '')
        .join('\n'),
  },
  {
    option: {
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
    function: async (text, regex) => {
      if (regex.length === 0) return text;
      const pattern = new RegExp(regex, 'i');
      return text
        .split('\n')
        .filter((line) => !pattern.test(line))
        .join('\n');
    },
  },
  {
    option: {
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
    function: async (text, regex) => {
      const pattern = new RegExp(regex);
      return text
        .split('\n')
        .map((line) => line.replace(pattern, ''))
        .join('\n');
    },
  },
  {
    option: {
      name: 'Remove Wrapping (unwrap)',
      description: 'Remove wrapping characters from each line',
      value: { key: 'removeWrapping' },
    },
    function: async (text) => {
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
  },
  {
    option: {
      name: 'Replace Regex in All Lines',
      description: 'Replace regex matches in all lines with specified text',
      value: {
        key: 'replaceRegexInAllLines',
        parameter: [
          {
            name: 'Regex',
            description: 'Enter the regex to replace',
            defaultValue: '(.+)',
          },
          {
            name: 'Replacement',
            description: 'Enter the replacement text, use $1, $2, etc. for captured groups',
            defaultValue: '$1',
          },
        ],
      },
    },
    function: async (text, regex, replacement = '***') => {
      if (regex.length === 0) return text;
      const pattern = new RegExp(regex, 'g');
      return text
        .split('\n')
        .map((line) => line.replace(pattern, replacement))
        .join('\n');
    },
  },
  {
    option: {
      name: 'Reverse (Undo) camelCase',
      description: 'Convert camelCase to Human readable',
      value: { key: 'reverseCamelCase' },
    },
    function: async (text) =>
      text
        .split('\n')
        .map((line) =>
          line
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim(),
        )
        .join('\n'),
  },
  {
    option: {
      name: 'Reverse Characters',
      description: 'Reverse the characters in the text',
      value: { key: 'reverseCharacters' },
    },
    function: async (text) =>
      text
        .split('\n')
        .map((line) => line.split('').reverse().join(''))
        .join('\n'),
  },
  {
    option: {
      name: 'Reverse Lines',
      description: 'Reverse the order of lines',
      value: { key: 'reverseLines' },
    },
    function: async (text) => text.split('\n').reverse().join('\n'),
  },
  {
    option: {
      name: 'Shuffle Lines',
      description: 'Randomly shuffle the order of lines',
      value: { key: 'shuffleLines' },
    },
    function: async (text) => {
      const lines = text.split('\n');
      for (let i = lines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = lines[i];
        lines[i] = lines[j];
        lines[j] = temp;
      }
      return lines.join('\n');
    },
  },
  {
    option: {
      name: 'snake_case',
      description: 'Convert text to snake_case',
      value: { key: 'snakeCase' },
    },
    function: async (text) =>
      text
        .split('\n')
        .map((line) =>
          line
            .replace(/[\s-_]+(\w)/g, (_, p) => `_${p.toLowerCase()}`)
            .replace(/^[A-Z]/, (match) => match.toLowerCase()),
        )
        .join('\n'),
  },
  {
    option: {
      name: 'Sort Lines Alphabetically',
      description: 'Sort lines alphabetically',
      value: { key: 'sortLinesAlphabetically' },
    },
    function: async (text) => text.split('\n').sort().join('\n'),
  },
  {
    option: {
      name: 'Sort Lines Numerically',
      description: 'Sort lines numerically',
      value: { key: 'sortLinesNumerically' },
    },
    function: async (text) =>
      text
        .split('\n')
        .sort((a, b) => parseInt(a) - parseInt(b))
        .join('\n'),
  },
  {
    option: {
      name: 'Split By',
      description: 'Split lines by a custom separator',
      value: {
        key: 'splitBy',
        parameter: { name: 'Separator', description: 'Enter a separator to split lines' },
      },
    },
    function: async (text, separator) => {
      let splitRegex;
      try {
        splitRegex = new RegExp(separator);
      } catch (e) {
        // Not a valid regex, use as string
        splitRegex = separator;
      }
      return text.split(splitRegex).join('\n');
    },
  },
  {
    option: {
      name: 'Sum All Numbers',
      description: 'Sum all numbers in each line',
      value: { key: 'sumAllNumbers' },
    },
    function: async (text) => {
      const sum = text
        .trim()
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => parseFloat(line.trim()))
        .reduce((total, num) => total + num, 0);
      return Math.round(sum * 10 ** 5) / 10 ** 5; // round to 5 decimal places
    },
  },
  {
    option: {
      name: 'Subtract All Numbers',
      description: 'Subtract all numbers in each line from the first number',
      value: { key: 'subtractAllNumbers' },
    },
    function: async (text) => {
      const numbers = text
        .trim()
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => parseFloat(line.trim()));
      const subtract = numbers[0] - numbers.slice(1).reduce((total, num) => total + num, 0);
      return Math.round(subtract * 10 ** 5) / 10 ** 5; // round to 5 decimal places
    },
  },
  {
    option: {
      name: 'Trim Each Line',
      description: 'Trim whitespace from the beginning and end of each line',
      value: { key: 'trimEachLine' },
    },
    function: async (text) =>
      text
        .split('\n')
        .map((line) => line.trim())
        .join('\n'),
  },
  {
    option: {
      name: 'Upper Case',
      description: 'Transform the entire text to upper case',
      value: { key: 'upperCase' },
    },
    function: async (text) => text.toUpperCase(),
  },
  {
    option: {
      name: 'Wrap Each Line With',
      description: 'Wrap each line with a custom character or string',
      value: {
        key: 'wrapEachLine',
        parameter: {
          name: 'Wrapper',
          description:
            'Enter a wrapper for each line, e.g. " or \'. Use 2 chars to wrap with the first and last character, e.g. []',
          defaultValue: '"',
        },
      },
    },
    function: async (text, wrapper) => {
      const eolChars = [',', '.', ';'];
      const [left, right] = wrapper.length === 1 ? [wrapper, wrapper] : wrapper.split('');
      return text
        .split('\n')
        .map((line) => {
          const lastChar = line.charAt(line.length - 1);
          const hasEOL = eolChars.includes(lastChar);
          if (hasEOL) {
            return `${left}${line.slice(0, -1)}${right}${lastChar}`;
          } else {
            return `${left}${line}${right}`;
          }
        })
        .join('\n');
    },
  },
];
