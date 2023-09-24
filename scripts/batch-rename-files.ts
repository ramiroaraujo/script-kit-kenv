// Name: Batch Rename Files
// Description: Rename all selected files in a batch

import "@johnlindquist/kit";
import {CacheHelper} from "../lib/cache-helper";

const renamings = {
    prepend: (filenames, extensions, prefix) => filenames.map((file, i) => `${prefix}${file}.${extensions[i]}`),
    append: (filenames, extensions, suffix) => filenames.map((file, i) => `${file}${suffix}.${extensions[i]}`),
    replaceWithRegex: (filenames, extensions, regexParts) => {
        const [search, replace] = regexParts.split('|');
        return filenames.map((file, i) => `${file.replace(new RegExp(search, 'g'), replace)}.${extensions[i]}`);
    },
    generateNumberedList: (filenames, extensions, index = 0) => filenames.map((file, i) => `${index + i + 1}_${file}.${extensions[i]}`)
};

const options = [
    {
        name: 'Finish',
        value: { key: 'finish' },
    },
    {
        name: 'Prepend',
        value: { key: 'prepend', parameter: { defaultValue: 'Prefix_' } },
    },
    {
        name: 'Append',
        value: { key: 'append', parameter: { defaultValue: '_Suffix' } },
    },
    {
        name: 'Replace with regex',
        value: { key: 'replaceWithRegex', parameter: { defaultValue: '.+|$1' } },
    },
    {
        name: 'Generate Numbered List',
        value: { key: 'generateNumberedList' },
    },
];


let files = (await getSelectedFile()).split('\n');
let basePath = files[0].split('/').slice(0, -1).join('/');

let filenames = files.map(file => file.split('/').pop().split('.')[0]);
let extensions = files.map(file => file.split('/').pop().split('.')[1]);

let originalFiles = [...filenames];

const handleRenaming = async (filenames, extensions, renaming) => {
    let { key, parameter } = renaming;
    let func = renamings[key];
    let paramValue = parameter
        ? await arg({
            input: parameter.defaultValue,
        },(input) => {
            try {
                return md(`<pre>${func.apply(null, [filenames, extensions, input]).join('\n')}</pre>`);
            } catch (e) {
                return md(`<pre>${filenames.join('\n')}</pre>`)
            }


        })
        : null;

    return func.apply(null, [filenames, extensions, paramValue]);
};

let operations = [];
let rerun = true;
const cache = new CacheHelper('batch-rename-files', 'never')
await cache.init();
const usage = cache.get('usage') ?? {}

while (rerun) {
    let renaming = await arg(
        {
            placeholder: "Choose a renaming option",
            hint: operations.join(' > '),
        },
        options
            .sort((a, b) => {
                if (a.value.key === "finish") return -1;
                if (b.value.key === "finish") return 1;

                const aCount = usage[a.value.key] || 0;
                const bCount = usage[b.value.key] || 0;
                return bCount - aCount;
            })
            .map(option => {
                return {
                    ...option,
                    preview: () => {
                        try {
                            //@todo fix first operation rendering
                            if (option.value.parameter) throw ''
                            const func = renamings[option.value.key]
                            const renamedFiles = func.apply(null, [filenames, extensions]);
                            debugger;
                            return md(`<pre>${renamedFiles.join('\n')}</pre>`)
                        } catch (e) {
                            return md(`<pre>${filenames.join('\n')}</pre>`)
                        }
                    },
                };
            })
    );

    if (renaming.key === "finish") {
        rerun = false;
    } else {
        usage[renaming.key] = (usage[renaming.key] || 0) + 1;
        await cache.store('usage', usage)
        operations.push(renaming.key);

        filenames = await handleRenaming(filenames, extensions, renaming);
    }
}
for (let i = 0; i < filenames.length; i++) {
    mv(`${basePath}/${originalFiles[i]}.${extensions[i]}`, `${basePath}/${filenames[i]}`);
}

await notify("Files renamed successfully");