// Name: ff token
// Description: Get a token impersonating a service account for requests to private services

import "@johnlindquist/kit";
import {CacheHelper} from "../lib/cache-helper";

const cache = new CacheHelper('ff-tokens', '1d')
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
const serviceAccounts = await cache.remember(`service-accounts-${selectedProject}`, async () => {
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
notify({
    title: "Token copied to clipboard",
    message: "Will expire in 1 hour"
});
