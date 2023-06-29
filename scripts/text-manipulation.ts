// Name: Text Manipulation
// Description: Transform clipboard text based on user-selected options

import "@johnlindquist/kit"

const xmlBeautifier = await npm("xml-beautifier");

const transformations = {
    upperCase: text => text.toUpperCase(),
    lowerCase: text => text.toLowerCase(),
    capitalize: text => text.split('\n').map(line => line.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')).join('\n'),
    snakeCase: text => text.split('\n').map(line => line.replace(/[\s-_]+(\w)/g, (_, p) => `_${p.toLowerCase()}`).replace(/^[A-Z]/, match => match.toLowerCase())).join('\n'),
    camelCase: text => text.split('\n').map(line => line.replace(/[\s-_]+(\w)/g, (_, p) => p.toUpperCase()).replace(/^[A-Z]/, match => match.toLowerCase())).join('\n'),
    reverseCamelCase: text => text.split('\n').map(line => line.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim()).join('\n'),
    kebabCase: text => text.split('\n').map(line => line.replace(/[\s-_]+(\w)/g, (_, p) => `-${p.toLowerCase()}`).replace(/^[A-Z]/, match => match.toLowerCase())).join('\n'),
    reverseCharacters: text => text.split('\n').map(line => line.split('').reverse().join('')).join('\n'),
    removeDuplicateLines: text => {
        let lines = text.split('\n');
        return [...new Set(lines)].join('\n');
    },
    keepOnlyDuplicateLines: text => {
        let lines = text.split('\n');
        let duplicates = lines.filter((item, index) => lines.indexOf(item) !== index);
        return [...new Set(duplicates)].join('\n');
    },
    removeEmptyLines: text => text.split('\n').filter(line => line.trim() !== '').join('\n'),
    removeAllNewLines: text => text.split('\n').map(line => line.trim()).join(''),
    trimEachLine: text => text.split('\n').map(line => line.trim()).join('\n'),
    sortLinesAlphabetically: text => text.split('\n').sort().join('\n'),
    sortLinesNumerically: text => text.split('\n').sort((a, b) => parseInt(a) - parseInt(b)).join('\n'),
    reverseLines: text => text.split('\n').reverse().join('\n'),
    shuffleLines: text => {
        let lines = text.split('\n')
        for (let i = lines.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1))
            let temp = lines[i]
            lines[i] = lines[j]
            lines[j] = temp
        }
        return lines.join('\n')
    },
    joinBy: (text, separator) => text.split('\n').join(separator),
    splitBy: (text, separator) => text.split(separator).join('\n'),
    removeWrapping: text => {
        const lines = text.split('\n');
        const matchingPairs = [['(', ')'], ['[', ']'], ['{', '}'], ['<', '>'], ['"', '"'], ["'", "'"]];
        const eolChars = [',', '.', ';'];

        return lines
            .map(line => {
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
                        return line.slice(1, -1 - adjustIndex) + (adjustIndex ? line.slice(-1) : "");
                    }
                }

                if (firstChar === lastChar) {
                    return line.slice(1, -1 - adjustIndex) + (adjustIndex ? line.slice(-1) : "");
                }

                return line;
            })
            .join('\n');
    },
    wrapEachLine: (text, wrapper) => {
        const lines = text.split('\n');
        const eolChars = [',', '.', ';'];

        return lines
            .map(line => {
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
            .map(line => {
                const match = line.match(pattern);
                return match ? match[0] : '';
            })
            .join('\n');
    },
    removeLinesMatching: (text, regex) => {
        if (regex.length === 0) return text;
        const lines = text.split('\n');
        const pattern = new RegExp(regex, 'i');

        return lines
            .filter(line => !pattern.test(line))
            .join('\n');
    },
    keepLinesMatching: (text, regex) => {
        if (regex.length === 0) return text;
        const lines = text.split('\n');
        const pattern = new RegExp(regex, 'i')

        return lines
            .filter(line => pattern.test(line))
            .join('\n');
    },
    prependTextToAllLines: (text, prefix) => {
        const lines = text.split('\n');
        return lines.map(line => prefix + line).join('\n');
    },

    appendTextToAllLines: (text, suffix) => {
        const lines = text.split('\n');
        return lines.map(line => line + suffix).join('\n');
    },

    replaceRegexInAllLines: (text, regexWithReplacement) => {
        const [regex, replacement] = regexWithReplacement.split('|');
        const pattern = new RegExp(regex, 'g');
        const lines = text.split('\n');
        return lines.map(line => line.replace(pattern, replacement)).join('\n');
    },
    removeRegexInAllLines: (text, regex) => {
        const pattern = new RegExp(regex, 'g');
        const lines = text.split('\n');
        return lines.map(line => line.replace(pattern, '')).join('\n');
    },
    generateNumberedList: (text) => {
        const lines = text.split('\n');
        return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
    },
    base64Encode: (text) => Buffer.from(text).toString('base64'),
    finish: text => text,
    countLines: (text) => text.split('\n').length,
    countWords: (text) => text.trim().split(/\s+/).length,
    countCharacters: (text) => text.length,
    sumAllNumbers: (text) => text.trim().split('\n')
        .map(line => Number(line.trim()))
        .reduce((total, num) => total + num, 0),
    base64Decode: (text) => Buffer.from(text, 'base64').toString('utf-8'),
    jsonPrettyPrint: text => JSON.stringify(JSON.parse(text), null, 2),
    xmlPrettyPrint: text => xmlBeautifier(text),
}

const options = [
    {
        name: "Sum All Numbers",
        description: "Sum all numbers in each line",
        value: {
            key: "sumAllNumbers",
        }
    },
    {
        name: "Upper Case",
        description: "Transform the entire text to upper case",
        value: {
            key: "upperCase",
        },
    },
    {
        name: "Lower Case",
        description: "Transform the entire text to lower case",
        value: {
            key: "lowerCase",
        },
    },
    {
        name: "snake_case", description: "Convert text to snake_case", value: {
            key: "snakeCase"
        }
    },
    {
        name: "Capitalize", description: "Convert text to Capital Case", value: {
            key: "capitalize"
        }
    },
    {
        name: "camelCase", description: "Convert text to camelCase", value: {
            key: "camelCase"
        }
    },
    {
        name: "Reverse camelCase", description: "Convert camelCase to Human readable", value: {
            key: "reverseCamelCase"
        }
    },
    {
        name: "kebab-case", description: "Convert text to kebab-case", value: {
            key: "kebabCase"
        }
    },
    {
        name: "Reverse Characters", description: "Reverse the characters in the text", value: {
            key: "reverseCharacters"
        }
    },
    {
        name: "Remove Duplicate Lines",
        description: "Remove duplicate lines from the text",
        value: {
            key: "removeDuplicateLines"
        }
    },
    {
        name: "Keep Only Duplicate Lines",
        description: "Keep only duplicate lines in the text",
        value: {
            key: "keepOnlyDuplicateLines"
        }
    },
    {
        name: "Remove Empty Lines", description: "Remove empty lines from the text", value: {
            key: "removeEmptyLines"
        }
    },
    {
        name: "Remove All New Lines", description: "Remove all new lines from the text", value: {
            key: "removeAllNewLines"
        }
    },
    {
        name: "Trim Each Line",
        description: "Trim whitespace from the beginning and end of each line",
        value: {
            key: "trimEachLine"
        }
    },
    {
        name: "Sort Lines Alphabetically", description: "Sort lines alphabetically", value: {
            key: "sortLinesAlphabetically"
        }
    },
    {
        name: "Sort Lines Numerically", description: "Sort lines numerically", value: {
            key: "sortLinesNumerically"
        }
    },
    {
        name: "Reverse Lines", description: "Reverse the order of lines", value: {
            key: "reverseLines"
        }
    },
    {
        name: "Shuffle Lines", description: "Randomly shuffle the order of lines", value: {
            key: "shuffleLines"
        }
    },
    {
        name: "Join By",
        description: "Join lines by a custom separator",
        value: {
            key: "joinBy",
            parameter: {
                name: "Separator",
                description: "Enter a separator to join lines",
                defaultValue: ",",
            },
        },
    },
    {
        name: "Split By",
        description: "Split lines by a custom separator",
        value: {
            key: "splitBy",
            parameter: {
                name: "Separator",
                description: "Enter a separator to split lines",
            },
        },
    },
    {
        name: "Remove Wrapping",
        description: "Remove wrapping characters from each line",
        value: {
            key: "removeWrapping",
        },
    },
    {
        name: "Wrap Each Line With",
        description: "Wrap each line with a custom character or string",
        value: {
            key: "wrapEachLine",
            parameter: {
                name: "Wrapper",
                description: "Enter a wrapper for each line",
                defaultValue: '"',
            },
        },
    },
    {
        name: "Capture Each Line",
        description: "Capture and return the first match of a regex pattern in each line",
        value: {
            key: "captureEachLine",
            parameter: {
                name: "Pattern",
                description: "Enter a regex pattern to capture",
                defaultValue: ".+",
            },
        },
    },
    {
        name: "Remove Lines Matching",
        description: "Remove lines that match the given regex",
        value: {
            key: "removeLinesMatching",
            parameter: {
                name: "Regex",
                description: "Enter a regex to match lines to remove",
                defaultValue: '',
            },
        },
    },
    {
        name: "Keep Lines Matching",
        description: "Keep lines that match the given regex",
        value: {
            key: "keepLinesMatching",
            parameter: {
                name: "Regex",
                description: "Enter a regex to match lines to keep",
                defaultValue: '.+',
            },
        },
    },
    {
        name: "Prepend Text to All Lines",
        description: "Add text to the beginning of all lines",
        value: {
            key: "prependTextToAllLines",
            parameter: {
                name: "Text",
                description: "Enter text to prepend to all lines",
                defaultValue: '',
            },
        },
    },
    {
        name: "Append Text to All Lines",
        description: "Add text to the end of all lines",
        value: {
            key: "appendTextToAllLines",
            parameter: {
                name: "Text",
                description: "Enter text to append to all lines",
                defaultValue: '',
            },
        },
    },
    {
        name: "Replace Regex in All Lines",
        description: "Replace regex matches in all lines with specified text",
        value: {
            key: "replaceRegexInAllLines",
            parameter: {
                name: "Regex and Replacement",
                description: "Enter regex and replacement text separated by a '|'",
                defaultValue: '(.+)|$1',
            },
        },
    },
    {
        name: "Remove Regex In All Lines",
        description: "Remove matches of the provided regex in all lines",
        value: {
            key: "removeRegexInAllLines",
            parameter: {
                name: "Regex",
                description: "Enter a regex to remove from all lines",
                defaultValue: '',
            },
        },
    },
    {
        name: "Generate Numbered List",
        description: "Prepend numbers to each line",
        value: {
            key: "generateNumberedList",
        },
    },
    {
        name: "Base64 Encode",
        description: "Encode text using Base64",
        value: {
            key: "base64Encode",
        },
    },
    {
        name: "Base64 Decode",
        description: "Decode text using Base64",
        value: {
            key: "base64Decode",
        },
    },
    {
        name: "Count Lines",
        description: "Count the number of lines",
        value: {
            key: "countLines",
        },
    },
    {
        name: "Count Words",
        description: "Count the number of words",
        value: {
            key: "countWords",
        },
    },
    {
        name: "Count Characters",
        description: "Count the number of characters",
        value: {
            key: "countCharacters",
        },
    },
    {
        name: "JSON Pretty Print",
        description: "Formats JSON strings for better readability",
        value: { key: "jsonPrettyPrint" }
    },
    {
        name: "XML Pretty Print",
        description: "Formats XML strings for better readability",
        value: { key: "xmlPrettyPrint" },
    }
]

const operationOptions = [
    {
        name: "Perform Last Transformations",
        description: "Perform the last transformations on the text and prompt for next",
        value: {
            key: "last",
        }
    },
    {
        name: "Perform Transformations",
        description: "Perform transformations on the text and copy to clipboard",
        value: {
            key: "finish",
        }
    },
    {
        name: "Save Transformations",
        description: "Save the current transformations under a custom name",
        value: {key: "save"},
    },
    {
        name: "List Saved Transformations",
        description: "List and execute saved transformation combos",
        value: {
            key: "listSaved",
        },
    }
]

const handleTransformation = async (text, transformation) => {
    let {key, parameter} = transformation;
    let paramValue = parameter ? await arg({
        input: parameter.defaultValue,
    }, (input) => md(`<pre>${transformations[key](text, input)}</pre>`)) : null;
    return {
        text: transformations[key](text, paramValue),
        name: key,
        paramValue
    };
};

const runAllTransformations = (all) => {
    return all.reduce((prev, curr) => {
        return transformations[curr.name].apply(null, [prev, ...curr.params])
    }, clipboardText)
}

let clipboardText = await clipboard.readText()
let operations: { name: string, params: any[] }[] = []
const cache = await db(`text-manipulation`, {usage: {}, timestamps: {}, last: null, persisted: {}});
let lastTransformations = cache.last ?? []

loop: while (true) {
    let transformation = await arg(
        {
            placeholder: "Choose a text transformation",
            hint: operations.map(o => o.name).join(' > '),
        },
        [...options, ...operationOptions]
            .map(option => {
                //last transformation if not available
                if (option.value.key === 'last' && (!lastTransformations.length || operations.length)) return null;
                //hide finish if no operations yet
                if (option.value.key === 'finish' && !operations.length) return null;
                //hide save if no operations yet
                if (option.value.key === "save" && !operations.length) return null;

                if (option.value.key === "listSaved" && Object.keys(cache.persisted).length === 0) return null;
                return option;
            })
            .filter(Boolean)
            .sort((a, b) => {

                if (a.value.key === 'last') return -1;
                if (b.value.key === 'last') return 1;

                if (a.value.key === 'finish') return -1;
                if (b.value.key === 'finish') return 1;

                if (a.value.key === 'save') return -1;
                if (b.value.key === 'save') return 1;

                if (a.value.key === 'listSaved') return -1;
                if (b.value.key === 'listSaved') return 1;

                const now = Date.now();
                const timeDecay = 3600 * 24 * 7 * 1000; // Time decay in milliseconds (e.g., 1 week)

                const aCount = cache.usage[a.value.key] || 0;
                const bCount = cache.usage[b.value.key] || 0;

                const aTimestamp = cache.timestamps[a.value.key] || now;
                const bTimestamp = cache.timestamps[b.value.key] || now;

                const aDecayedCount = aCount * Math.exp(-(now - aTimestamp) / timeDecay);
                const bDecayedCount = bCount * Math.exp(-(now - bTimestamp) / timeDecay);

                return bDecayedCount - aDecayedCount;
            })
            .map(option => {
                return {
                    ...option,
                    preview: () => {
                        try {
                            if (option.value.key === 'last') return md(`<pre>${runAllTransformations(lastTransformations)}</pre>`)
                            if (option.value['parameter']) throw '';
                            return md(`<pre>${transformations[option.value.key](clipboardText)}</pre>`)
                        } catch (e) {
                            return md(`<pre>${clipboardText}</pre>`)
                        }
                    },
                }
            })
    )

    switch (transformation.key) {
        case 'finish':
            break loop
        case 'last':
            clipboardText = runAllTransformations(lastTransformations);
            operations = [...lastTransformations]

            //remove last transformations from local memory
            //it is still persisted and will be updated if new transformations are applied
            lastTransformations = null;
            break;
        case "save":
            const transformationName = await arg("Enter a name for this transformations:");

            cache.persisted[transformations.camelCase(transformationName)] = operations;
            await cache.write();
            break loop;
        case "listSaved":
            let flags = { delete: { name: "Delete", shortcut: "cmd+enter", } }
            const savedTransformationName = await arg(
                {
                    placeholder: "Select a saved transformation to apply:",
                    flags
                },
                Object.keys(cache.persisted).map((name) => {
                    return {
                        name: transformations.reverseCamelCase(name),
                        value: name,
                    };
                })
            );
            if (flag.delete) {
                let value = await arg("Are you sure you want to delete this transformation?", ['yes', 'no'])
                if (value === "yes") {
                    delete cache.persisted[savedTransformationName];
                    await cache.write();
                    await notify(`Transformation ${savedTransformationName} deleted`);
                }
            } else {
                const savedTransformation = cache.persisted[savedTransformationName];
                clipboardText = runAllTransformations(savedTransformation);
                operations = [...savedTransformation]
                lastTransformations = [];
            }
            break;
        default:
            const result = await handleTransformation(clipboardText, transformation);
            clipboardText = result.text;

            //save operations
            operations.push({name: result.name, params: [result.paramValue]});

            //store usage for sorting
            cache.usage[transformation.key] = (cache.usage[transformation.key] || 0) + 1;
            cache.timestamps[transformation.key] = Date.now();
    }
}

//store last transformations
cache.last = operations;
await cache.write();

await clipboard.writeText(clipboardText)

await notify("Text transformation applied and copied to clipboard")
