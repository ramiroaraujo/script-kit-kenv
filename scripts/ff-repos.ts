// Name: ff repos

import "@johnlindquist/kit";
import {CacheHelper} from "../lib/cache-helper";

const db = new CacheHelper().setKey('ff-repos')

const perPage = 10;
const headers = {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json'
};

const getRepos = async () => {

    return await db.cache('repos', async () => {
        const response = await fetch(`https://api.github.com/orgs/FactoryFixInc/repos?per_page=${perPage}`, {headers});
        const linkHeader = response.headers.get('link');
        let results = []
        if (linkHeader) {
            const lastPageNum = parseInt(linkHeader.match(/&page=(\d+)>; rel="last"/)[1]);

            // fetch all pages in parallel
            const promises = [];
            for (let pageNum = 2; pageNum <= lastPageNum; pageNum++) {
                promises.push(fetch(`https://api.github.com/orgs/FactoryFixInc/repos?per_page=${perPage}&page=${pageNum}`, {headers}).then(res => res.json()));
            }
            results = await Promise.all(promises);
        }

        // combine all results
        return [await response.json(), ...results].flat();
    }, 1000 * 60 * 60 * 24 * 7);
}

const getPullRequests = async (repo) => {
    const response = await fetch(
        `https://api.github.com/repos/FactoryFixInc/${repo.name}/pulls?state=open`,
        {headers}
    );
    return await response.json();
};

const repos = await getRepos();
const repo:any  = await arg("Select a repo to clone or invalidate cache", [
    ...repos.map((repo) => ({name: repo.name, value: repo})),
    db.defaultInvalidate,
]);

if (repo === "invalidate") {
    await db.clearCache()
    notify("Cache invalidated")
    exit()
}


const operation = await arg("Select an operation", [
    {name: "Open", value: "open"},
    {name: "Open Pull Requests", value: "pull"},
    {name: "List Open Pull Requests", value: "list_pulls"},
    {name: "Copy Clone URI", value: "clone"},
    {name: "Copy Repo Name", value: "copy_name"},
]);

switch (operation) {
    case 'open':
        await exec(`open -na "Google Chrome" --args --profile-directory="Profile 1" "${repo.html_url}"`)
        break;
    case 'pull':
        await exec(`open -na "Google Chrome" --args --profile-directory="Profile 1" "${repo.html_url}/pulls"`)
        break;
    case "list_pulls":
        const pullRequests = await getPullRequests(repo);
        if (pullRequests.length === 0) {
            await notify(`No open pull requests for ${repo.name}`);
        } else {
            const selectedPullRequest = await arg(
                "Select a pull request to open",
                pullRequests.map((pr) => ({
                    name: `${pr.number}: ${pr.title}`,
                    value: pr.html_url,
                }))
            );
            await exec(
                `open -na "Google Chrome" --args --profile-directory="Profile 1" "${selectedPullRequest}"`
            );
        }
        break;
    case 'clone':
        await clipboard.writeText(repo.clone_url);
        await notify(`Copied ${repo.clone_url} to clipboard`);
        break;
    case "copy_name":
        await clipboard.writeText(repo.name);
        await notify(`Copied ${repo.name} to clipboard`);
        break;
}