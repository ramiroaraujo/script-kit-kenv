// Name: ff repos

import "@johnlindquist/kit";

type Repo = {
    name: string;
    url: string;
    git_url: string;
}

const perPage = 10;
const headers = {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json'
};

// ----------------- cache helper ----------------
let cacheData = await db(`ff-repos`, {content: {}})
const cache = async (type, expires, invoke: Function) => {
    if (cacheData.data.content[type]?.data && Date.now() - cacheData.data.content[type]?.expires < expires) {
        return cacheData.data.content[type].data
    }
    const data = await invoke()
    cacheData.data.content[type] = {expires: Date.now() + expires, data}
    await cacheData.write()
    return data
}
const clearCache = async () => {
    cacheData.data.content = {};
    await cacheData.write();
}
// ----------------- cache helper ----------------

const getRepos = async () => {

    const repos = await cache('repos', 1000 * 60 * 60 * 24 * 7, async () => {
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
    })

    return repos;
}

const getPullRequests = async (repo) => {
    const response = await fetch(
        `https://api.github.com/repos/FactoryFixInc/${repo.name}/pulls?state=open`,
        {headers}
    );
    return await response.json();
};

const invalidateCacheOption = {name: "Invalidate cache", value: "invalidate_cache"};

let repo;
do {
    const repos = await getRepos();
    repo = await arg("Select a repo to clone or invalidate cache", [
        ...repos.map((repo) => ({name: repo.name, value: repo})),
        invalidateCacheOption,
    ]);

    if (repo === "invalidate_cache") {
        await clearCache();
    }
} while (repo === "invalidate_cache");


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