// Name: Batch Rename Files
// Description: Rename all selected files in a batch

import "@johnlindquist/kit";

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

// files = files.map(file => file.split('/').pop().trim());
let originalFiles = [...filenames];

const handleRenaming = async (filenames, extensions, renaming) => {
    let { key, parameter } = renaming;
    let func = renamings[key];
    let paramValue = parameter
        ? await arg({
            input: parameter.defaultValue,
        },(input) => md(`<pre>${func.apply(null, [filenames, extensions, input]).join('\n')}</pre>`))
        : null;

    debugger;
    return func.apply(null, [filenames, extensions, paramValue]);
};

let operations = [];
let rerun = true;
const cache = await db(`batch-file-rename`, { usage: {} });

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

                const aCount = cache.usage[a.value.key] || 0;
                const bCount = cache.usage[b.value.key] || 0;
                return bCount - aCount;
            })
            .map(option => {
                return {
                    ...option,
                    preview: () => {
                        try {
                            if (option.value.parameter) throw ''
                            const renamedFiles = renamings[option.value.key](filenames);
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
        cache.usage[renaming.key] = (cache.usage[renaming.key] || 0) + 1;
        await cache.write();
        operations.push(renaming.key);

        filenames = await handleRenaming(filenames, extensions, renaming);

    }
}
for (let i = 0; i < filenames.length; i++) {
    await mv(`${basePath}/${originalFiles[i]}`, `${basePath}/${filenames[i]}`);
}

await notify("Files renamed successfully");