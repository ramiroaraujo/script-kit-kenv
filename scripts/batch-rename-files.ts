// Batch File Rename
import "@johnlindquist/kit";

const renamings = {
    prepend: (file, prefix) => `${prefix}${file}`,
    append: (file, suffix) => {
        const fileParts = file.split('.');
        const extension = fileParts.pop();
        const fileName = fileParts.join('.');
        return `${fileName}${suffix}.${extension}`;
    },
    replaceWithRegex: (file, [search, replace]) => {
        const fileParts = file.split('.');
        const extension = fileParts.pop();
        const fileName = fileParts.join('.');
        return fileName.replace(new RegExp(search, 'g'), replace) + '.' + extension;
    },
    generateNumberedList: (file, index) => `${index}-${file}`
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
        value: { key: 'replaceWithRegex', parameter: { defaultValue: 'search,replace' } },
    },
    {
        name: 'Generate Numbered List',
        value: { key: 'generateNumberedList' },
    },
];


let files = (await getSelectedFile()).split('\n');
let basePath = files[0].split('/').slice(0, -1).join('/');
files = files.map(file => file.split('/').pop().trim());
let originalFiles = [...files];

const handleRenaming = async (files, renaming) => {
    let { key, parameter } = renaming;
    let paramValue = parameter
        ? await arg({
            input: parameter.defaultValue,
        },(input) => md(`<pre>${files.map(f => renamings[key](f, input)).join('\n')}</pre>`))
        : null;
    return files.map((file) => renamings[key](file, paramValue));
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
                            const renamedFiles = files.map(file => renamings[option.value.key](file));
                            return md(`<pre>${renamedFiles.join('\n')}</pre>`)
                        } catch (e) {
                            return md(`<pre>${files.join('\n')}</pre>`)
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

        files = await handleRenaming(files, renaming);
    }
}
for (let i = 0; i < files.length; i++) {
    await mv(`${basePath}/${originalFiles[i]}`, `${basePath}/${files[i]}`);
}

await notify("Files renamed successfully");
