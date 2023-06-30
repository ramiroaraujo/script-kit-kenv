// Name: Extract with jq
// WIP, should show the JSON content in the preview, parse the input, if it's invalid jq indicate it in hint, but keep
// showing the JSON. Basically the JSON in the preview should always reflect the result of the jq transform.
// maybe keep a record of "lastValidjq" and show that in the preview if the current input is invalid.

import "@johnlindquist/kit";

// Fetch clipboard content
let content = await clipboard.readText();

// Prompt for a jq transform
let transform = await arg({
    placeholder: "Enter a jq transform:",
    validate: (input) => false,
    hint: 'invalid jq'

});

// Apply the jq transformation
let transformedContent = await exec(`/opt/homebrew/bin/jq '${transform}'`, {
    input: content,
    env: {
        PATH: `${env.PATH}:/opt/homebrew/bin`,
    },
});

// Show the transformed content in a preview
let previewContent = transformedContent.all;
let lines = previewContent.split("\n");
if (lines.length > 10) {
    // Show only the first 10 lines, followed by a message about the omitted lines
    previewContent = lines.slice(0, 10).join("\n") + `\n\n...and ${lines.length - 10} more lines`;
}
let previewText = `Transformed content:\n\n${previewContent}`;
let previewChoices = [{ name: previewText, value: transformedContent.all }];

let selectedValue = await arg("Preview:", previewChoices);

// Copy the selected value to clipboard
await clipboard.writeText(selectedValue);

await notify("Transformed content copied to clipboard.");
