// Name: ff token
// Description: Get a token impersonating a service account for requests to private services

import "@johnlindquist/kit";
import {CacheHelper} from "../lib/cache-helper";
import {binPath} from "../lib/bin-helper";

const cache = new CacheHelper('ff-tokens', '1d')

const glcoud = await binPath('gcloud')

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
const instancesData = await cache.remember(`instances-${selectedProject}`, async () => {
    const { stdout:cloudRunInstances } = await exec(
        `${glcoud} run services list --platform=managed --project=${selectedProject} --format="json"`
    );
    return JSON.parse(cloudRunInstances)
})
const instances = instancesData.map((instance) => ({
    name: instance.metadata.name,
    value: instance.status.url
}));
const selectedAudience = await arg("Choose an audience", instances);

//select a service account
const serviceAccounts = await cache.remember(`service-accounts-${selectedProject}`, async () => {
    const { stdout: serviceAccountsData} = await exec(
        `${glcoud} iam service-accounts list --project=${selectedProject} --format=json`
    );
    return JSON.parse(serviceAccountsData)
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

const { stdout: identityToken } = await exec(
    `${glcoud} auth print-identity-token --impersonate-service-account="${selectedServiceAccount}" --audiences="${selectedAudience}" --project=${selectedProject}`
);

await clipboard.writeText(identityToken.trim());
notify({
    title: "Token copied to clipboard",
    message: "Will expire in 1 hour"
});
