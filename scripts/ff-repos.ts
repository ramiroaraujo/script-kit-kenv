// Name: FF Repos

import '@johnlindquist/kit';
import { CacheHelper } from '../lib/cache-helper';
import { getEnv } from '../lib/env-helper';

const cache = new CacheHelper('ff-repos', '1h');

const perPage = 10;

const env = getEnv('GITHUB_TOKEN');
const chromeProfile = getEnv('CHROME_PROFILE', 'Default');
const githubUrl = 'https://api.github.com';

const headers = {
  Authorization: `Bearer ${env}`,
  Accept: 'application/vnd.github.v3+json',
};

const getRepos = async () => {
  return await cache.remember('repos', async () => {
    const response = await fetch(`${githubUrl}/orgs/FactoryFixInc/repos?per_page=${perPage}`, {
      headers,
    });
    const linkHeader = response.headers.get('link');
    let results = [];
    if (linkHeader) {
      const lastPageNum = parseInt(linkHeader.match(/&page=(\d+)>; rel="last"/)[1]);

      // fetch all pages in parallel
      const promises = [];
      for (let pageNum = 2; pageNum <= lastPageNum; pageNum++) {
        promises.push(
          fetch(`${githubUrl}/orgs/FactoryFixInc/repos?per_page=${perPage}&page=${pageNum}`, {
            headers,
          }).then((res) => res.json()),
        );
      }
      results = await Promise.all(promises);
    }

    // combine all results
    return [await response.json(), ...results].flat();
  });
};

const getPullRequests = async (repo) => {
  const response = await fetch(`${githubUrl}/repos/FactoryFixInc/${repo.name}/pulls?state=open`, {
    headers,
  });
  return await response.json();
};

const repos = await getRepos();
const repo: any = await arg('Select a repo to clone or invalidate cache', [
  ...repos.map((repo) => ({ name: repo.name, value: repo })),
  cache.defaultInvalidate,
]);

if (repo === 'invalidate') {
  await cache.clear();
  notify('Cache invalidated');
  exit();
}

const operation = await arg('Select an operation', [
  { name: 'Open', value: 'open' },
  { name: 'Open Pull Requests', value: 'pull' },
  { name: 'List Open Pull Requests', value: 'list_pulls' },
  { name: 'Copy Clone URI', value: 'clone' },
  { name: 'Copy Repo Name', value: 'copy_name' },
]);

switch (operation) {
  case 'open':
    await exec(
      `open -na "Google Chrome" --args --profile-directory="${chromeProfile}" "${repo.html_url}"`,
    );
    break;
  case 'pull':
    await exec(
      `open -na "Google Chrome" --args --profile-directory="${chromeProfile}" "${repo.html_url}/pulls"`,
    );
    break;
  case 'list_pulls': {
    const pullRequests = await getPullRequests(repo);
    if (pullRequests.length === 0) {
      notify(`No open pull requests for ${repo.name}`);
    } else {
      const selectedPullRequest = await arg(
        'Select a pull request to open',
        pullRequests.map((pr) => ({
          name: `${pr.number}: ${pr.title}`,
          value: pr.html_url,
        })),
      );
      await exec(
        `open -na "Google Chrome" --args --profile-directory="${chromeProfile}" "${selectedPullRequest}"`,
      );
    }
    break;
  }
  case 'clone':
    await clipboard.writeText(repo.clone_url);
    notify(`Copied ${repo.clone_url} to clipboard`);
    break;
  case 'copy_name':
    await clipboard.writeText(repo.name);
    notify(`Copied ${repo.name} to clipboard`);
    break;
}
