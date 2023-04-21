// Name: ff gcp

import "@johnlindquist/kit"

const urls = [
    { name: 'Cloud Run', value: 'https://console.cloud.google.com/run?project='},
    { name: 'Cloud Scheduler', value: 'https://console.cloud.google.com/cloudscheduler?project='},
    { name: 'Firestore', value: 'https://console.cloud.google.com/firestore?project='},
    { name: 'Logs', value: 'https://console.cloud.google.com/logs/query?project='},
    { name: 'Errors', value: 'https://console.cloud.google.com/errors?project='},
    { name: 'Storage', value: 'https://console.cloud.google.com/storage/browser?project='},
    { name: 'Secret Manager', value: 'https://console.cloud.google.com/security/secret-manager?project='},
]

//select from a list of options
const env = await arg("Choose an environment", [
    "ff-app-dev",
    'ff-app-prod',
    'ff-app-iso-1',
    'ff-app-iso-2',
    'ff-app-iso-3',
    'ff-app-iso-4',
    'ff-app-e2e',
])

//select from the urls list
const url = await arg("Choose a url", urls)

//append env
const urlWithEnv = `${url}${env}`


//open url in chrome in FF profile
await exec(`open -na "Google Chrome" --args --profile-directory="Profile 1" "${urlWithEnv}"`)