// Name: ff token
// Description: Get a token impersonating a service account for requests to private services

import '@johnlindquist/kit';
import { CacheHelper } from '../lib/cache-helper';
import { binPath } from '../lib/bin-helper';
import { selectEnv } from '../lib/ff-helper';

const cache = new CacheHelper('ff-tokens', '1d');

const gcloud = await binPath('gcloud');

//select a project (no prod, no service account impersonation on prod)
const env = await selectEnv(true);

//select an audience
const instancesData = await cache.remember(`instances-${env}`, async () => {
  const { stdout: cloudRunInstances } = await exec(
    `${gcloud} run services list --platform=managed --project=${env} --format="json"`,
  );
  return JSON.parse(cloudRunInstances);
});
const instances = instancesData.map((instance) => ({
  name: instance.metadata.name,
  value: instance.status.url,
}));
const selectedAudience = await arg('Choose an audience', instances);

//select a service account
const serviceAccounts = await cache.remember(`service-accounts-${env}`, async () => {
  const { stdout: serviceAccountsData } = await exec(
    `${gcloud} iam service-accounts list --project=${env} --format=json`,
  );
  return JSON.parse(serviceAccountsData);
});

const serviceAccountEmails = serviceAccounts.map((account) => ({
  name: account.email,
  value: account.email,
}));
const selectedServiceAccount = await arg('Choose a service account', serviceAccountEmails);

log(env, selectedAudience, selectedServiceAccount);

const { stdout: identityToken } = await exec(
  `${gcloud} auth print-identity-token \
  --impersonate-service-account="${selectedServiceAccount}" \
  --audiences="${selectedAudience}" \
  --project=${env}`,
);

await clipboard.writeText(identityToken.trim());
notify({
  title: 'Token copied to clipboard',
  message: 'Will expire in 1 hour',
});
