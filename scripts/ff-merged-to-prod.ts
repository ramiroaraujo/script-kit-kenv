// Name: FF Merged to Prod

import "@johnlindquist/kit";

// 1. Fetch GitHub PR URLs from the clipboard
let prURLs = (await clipboard.readText()).split('\n');

let notifications = [];
for(let prURL of prURLs) {
    prURL = prURL.trim();

    // Validate the URL
    let match = prURL.match(/https:\/\/github.com\/.*\/(.*)\/pull\/(\d+)/);

    if (!match) {
        notifications.push(`Invalid GitHub PR URL: ${prURL}`);
        continue;
    }

    const [,projectName, prNumber] = match;

    // Verify if project folder exists
    let path = home(`FactoryFix/${projectName}`);
    if(!await pathExists(path)){
        notifications.push(`No folder found for the project: ${projectName}`);
        continue;
    }

    // Execute the command to check if the PR is merged to prod
    let prSha = await exec(`cd ${path} && /opt/homebrew/bin/gh pr view ${prNumber} --json commits --jq '.commits[-1].oid'`);
    await exec(`cd ${path} && git fetch origin prod > /dev/null 2>&1`);
    let isMerged = (await exec(`cd ${path} && git merge-base --is-ancestor ${prSha.stdout.trim()} origin/prod && echo "yes" || echo "no"`)).stdout.trim();

    // Add to the notifications
    notifications.push(isMerged === "yes" ? `The PR #${prNumber} is merged to prod.` : `The PR #${prNumber} is not merged to prod.`);
}

// 2. Notify and copy to clipboard
for(let note of notifications) {
    await notify(note);
}
await clipboard.writeText(notifications.join('\n'));

// 3. Notify the completion
await notify("All PR checks completed. Results copied to clipboard.");
