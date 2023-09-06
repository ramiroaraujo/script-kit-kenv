// Name: Extract with jq

import "@johnlindquist/kit";

// Fetch clipboard content
const content = await clipboard.readText();

const transform = async (text: string, query: string): Promise<string> => {
    let response = await exec(`jq ${query}`, {
        reject: false,
        input: text,
        env: {
            PATH: `${env.PATH}:/opt/homebrew/bin`,
        },
    });
    if (response.failed) {
        throw new Error('invalid query');
    }
    if (response.stdout.trim() === 'null') {
        throw new Error('null');
    }
    return response.stdout;
}

// Prompt for a jq transform
const query = await arg({
    placeholder: "Enter a jq transform:",
    ignoreBlur: true,
    input: '.',
}, async (input) => {
    try {
        const result = await transform(content, input);
        return md(`<pre style="margin-top: 0">${result}</pre>`);
    } catch (e) {
        if (e.message === 'null')
            return md(`_null results_\n<pre>${content}</pre>`);
        else
            return md(`_Invalid query_\n<pre>${content}</pre>`);
    }
});

// Apply the jq transformation
const extract = await transform(content, query);

// Copy the transformed content to the clipboard
await clipboard.writeText(extract);

notify('Transformed content copied to clipboard');
