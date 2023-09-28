// Name: FF Merged to Prod

import '@johnlindquist/kit';
import { binPath } from '../lib/bin-helper';
import { FFService } from '../lib/ff-service';

const gh = binPath('gh');

// 1. Fetch GitHub PR URLs from the clipboard
const prURLs = (await clipboard.readText()).split('\n');

const notifications = [];
for (let prURL of prURLs) {
  prURL = prURL.trim();

  // Validate the URL
  const match = prURL.match(/https:\/\/github.com\/.*\/(.*)\/pull\/(\d+)/);

  if (!match) {
    notifications.push(`Invalid GitHub PR URL: ${prURL}`);
    continue;
  }

  const [, projectName, prNumber] = match;

  const service = await FFService.init(projectName);

  // Verify if project folder exists
  const path = service.getPath();
  if (!(await pathExists(path))) {
    notifications.push(`No folder found for the project: ${projectName}`);
    continue;
  }

  // Execute the command to check if the PR is merged to prod
  const prSha = await exec(
    `cd ${path} && ${gh} pr view ${prNumber} --json commits --jq '.commits[-1].oid'`,
  );
  await exec(`cd ${path} && git fetch origin prod > /dev/null 2>&1`);
  const isMerged = (
    await exec(
      `cd ${path} && git merge-base --is-ancestor ${prSha.stdout.trim()} origin/prod && echo "yes" || echo "no"`,
    )
  ).stdout.trim();

  // Add to the notifications
  notifications.push(
    isMerged === 'yes'
      ? `The PR #${prNumber} is merged to prod.`
      : `The PR #${prNumber} is not merged to prod.`,
  );
}

// 2. Notify and copy to clipboard
for (const note of notifications) {
  notify(note);
}
await clipboard.writeText(notifications.join('\n'));

// 3. Notify the completion
notify('All PR checks completed. Results copied to clipboard.');
