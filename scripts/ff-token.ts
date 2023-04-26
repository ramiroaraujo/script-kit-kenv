// Name: ff token
// Description: Get a token impersonating a service account for requests to private services

import "@johnlindquist/kit";

// ----------------- cache helper ----------------
let cacheData = await db(`ff-tokens`, {content: {}})
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

//select a project (no prod, no service account impersonation on prod)
const projects = [
    "ff-app-dev",
    "ff-app-iso-1",
    "ff-app-iso-2",
    "ff-app-iso-3",
    "ff-app-iso-4",
    "ff-app-e2e",
];
const selectedProject = await arg("Choose a project", projects);

//select an audience
const instancesData = await cache(`instances-${selectedProject}`, 1000 * 60 * 60 * 24, async () => {
    const cloudRunInstances = await exec(
        `/opt/homebrew/bin/gcloud run services list --platform=managed --project=${selectedProject} --format="json"`
    );
    return JSON.parse(cloudRunInstances.stdout)
})
const instances = instancesData.map((instance) => ({
    name: instance.metadata.name,
    value: instance.status.url
}));
const selectedAudience = await arg("Choose an audience", instances);

//select a service account
const serviceAccounts = await cache(`service-accounts-${selectedProject}`, 1000 * 60 * 60 * 24, async () => {
    const serviceAccountsData = await exec(
        `/opt/homebrew/bin/gcloud iam service-accounts list --project=${selectedProject} --format=json`
    );
    return JSON.parse(serviceAccountsData.stdout)
})
const serviceAccountEmails = serviceAccounts.map((account) => ({
    name: account.email,
    value: account.email,
}));
const selectedServiceAccount = await arg(
    "Choose a service account",
    serviceAccountEmails
);

log(selectedProject, selectedAudience, selectedServiceAccount);

const identityToken = await exec(
    `/opt/homebrew/bin/gcloud auth print-identity-token --impersonate-service-account="${selectedServiceAccount}" --audiences="${selectedAudience}" --project=${selectedProject}`
);

await clipboard.writeText(identityToken.stdout.trim());
await notify({
    title: "Token copied to clipboard",
    message: "Will expire in 1 hour"
});
