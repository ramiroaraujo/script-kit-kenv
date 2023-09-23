// Name: ff gcp

import "@johnlindquist/kit"
import {CacheHelper} from "../lib/cache-helper";

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
const url = await arg("Choose a url", [
        {
            name: 'Cloud Run', value: {
                url: 'https://console.cloud.google.com/run?project=',
                type: 'run'
            }
        },
        {
            name: 'Cloud Scheduler', value: {
                url: 'https://console.cloud.google.com/cloudscheduler?project=',
                type: 'scheduler'
            }
        },
        {
            name: 'Firestore', value: {
                url: 'https://console.cloud.google.com/firestore/databases/-default-?project=',
                query: 'https://console.cloud.google.com/firestore/databases/-default-?project=',
                type: 'firestore',
                // hardcoded since we don't have a way to get the collections from the cli
                collections: [
                    'ats-job__temporary-job-description',
                    'ats-job__temporary-screening-questions',
                    'ats_analytics__application',
                    'ats_anywhere_service__indeed_employer_information',
                    'ats_anywhere_service__indeed_employer_request_information',
                    'ats_anywhere_service__job',
                    'ats_application_messaging__pro_screener_questions_flow',
                    'ats_application_scoring__pro_scoring',
                    'ats_calendar_api#calendar_integration',
                    'ats_calendar_api#interviews',
                    'ats_candidate_discovery__ats_viewed_candidates',
                    'ats_candidate_discovery__pro_unlocks',
                    'ats_candidate_discovery__saved_search',
                    'ats_candidate_discovery__saved_search_notified_pros',
                    'ats_candidate_discovery__shortlist',
                    'ats_candidate_discovery__shortlist_pro',
                    'ats_dashboard_jobs',
                    'ats_employer__domain_blacklist',
                    'ats_employer__employer_domain',
                    'ats_employer_conversation#ats_conversation_participants',
                    'ats_employer_conversation__job_summary',
                    'ats_employer_feature',
                    'ats_employer_inbox__notification',
                    'ats_integrator',
                    'ats_integrator_applications',
                    'ats_integrator_customers',
                    'ats_integrator_jobs',
                    'ats_integrator_ukg_jobs_cache',
                    'ats_subscription__subscription',
                    'ats_subscription__subscription_history',
                    'ats_user_preferences__user',
                    'careeronestop_scraper__occupations',
                    'careeronestop_scraper__school_programs',
                    'cities_zip',
                    'companies',
                    'jb-allow-listed-urls',
                    'jb-source-primary-allow-list',
                    'jb_linkedin_job_post',
                    'jb_notifications_queue',
                    'jb_user_application_history',
                    'jb_user_outreach_email_mappings',
                    'jd_bid_log',
                    'jd_craigslist_posted_jobs',
                    'jd_failed_external_application',
                    'jd_feed_level',
                    'jd_job_publisher_daily_report_failure_log',
                    'jd_job_publisher_level',
                    'jd_publisher_config',
                    'jn_message_logs',
                    'job-coordinates',
                    'jobCoordinates',
                    'job_feeds__application_target',
                    'job_feeds__applications_sync',
                    'job_feeds__bid_log',
                    'job_feeds__job_bids',
                    'job_feeds__linkedin_promoted_jobs',
                    'job_feeds__slot_based_publishers_config',
                    'job_ingest_cache',
                    'job_variation__job_title_variations',
                    'job_variation__job_variations',
                    'jobs',
                    'scraper_configuration',
                    'scraper_configuration_flagged',
                    'seo-city-pages',
                    'seo-job-titles-pages',
                    'ub_linkedin_cookies'
                ]
            }
        },
        {
            name: 'Logs', value: {
                url: 'https://console.cloud.google.com/logs/query?project=',
                type: 'logs'
            }
        },
        {
            name: 'Errors', value: {
                url: 'https://console.cloud.google.com/errors?project=',
                type: null
            }
        },
        {
            name: 'Storage', value: {
                url: 'https://console.cloud.google.com/storage/browser?project=',
                type: 'storage'
            }
        },
        {
            name: 'Secret Manager', value: {
                url: 'https://console.cloud.google.com/security/secret-manager?project=',
                type: 'secrets'
            }
        },
        {
            name: 'IAM service accounts', value: {
                url: 'https://console.cloud.google.com/iam-admin/serviceaccounts?project=',
                type: null
            }
        },
        {
            name: 'Invalidate Cache', value: {
                type: 'invalidate'
            }
        }
    ]
)

//create cache after the env is selected
const cache = new CacheHelper(`ff-gcp-${env}`, '1w')

//append env
let finalUrl = `${url.url}${env}`

const openList = {name: 'Open list', value: finalUrl}

if (url.type === 'run') {
    const data = await cache.remember('run', async () => {
        const cloudRunInstances = await exec(`/opt/homebrew/bin/gcloud run services list --platform=managed --project=${env} --format="json"`)
        return JSON.parse(cloudRunInstances.stdout)
    })

    const instances = data.map(instance => ({
        name: `Open service ${instance.metadata.name}`,
        value: `https://console.cloud.google.com/run/detail/${instance.metadata.labels['cloud.googleapis.com/location']}/${instance.metadata.name}/metrics?project=${env}`,
    }))

    finalUrl = await arg("Choose a Cloud Run instance", [
        openList, ...instances])
} else if (url.type === 'scheduler') {
    const data = await cache.remember('scheduler', async () => {
        const cloudSchedulerInstances = await exec(`/opt/homebrew/bin/gcloud scheduler jobs list --project=${env} --format="json"`)
        return JSON.parse(cloudSchedulerInstances.stdout)
    })

    const schedulerInstances = data.map(job => ({
        name: `Copy ${job.name.split('/').pop()}`,
        description: job.description,
        value: job.name.split('/').pop(),
    }))

    const result = await arg("Choose a Cloud Scheduler task", [
        openList, ...schedulerInstances])
    if (result !== 'Open') {
        await clipboard.writeText(result)
        await notify('paste the name into the filters')
    }
} else if (url.type === 'firestore') {
    const collections = url.collections.map(collection => ({
        name: `Open collection ${collection}`,
        value: {
            url: `https://console.cloud.google.com/firestore/databases/-default-/data/panel/${collection}?project=${env}`,
            query: `https://console.cloud.google.com/firestore/databases/-default-/data/query;collection=%2F${collection}?project=${env}`
        }
    }))
    let flags = {
        query: {
            name: "Query",
            shortcut: "cmd+enter",
        },
    }

    const result = await arg({
        placeholder: "Choose a Firestore Collection (Cmd + enter to open the query)",
        flags,
    }, [
        {name: 'Open', value: {url: url.query, query: url.query}}, ...collections])

    if (result.url) {
        if (!flag?.query) {
            finalUrl = result.url
        } else {
            finalUrl = result.query
        }
    }

} else if (url.type === 'storage') {
    const data = await cache.remember('storage', async () => {
        const storageBuckets = await exec(
            `/opt/homebrew/bin/gcloud storage buckets list --project=${env} --format="json"`
        );
        return JSON.parse(storageBuckets.stdout)
    })

    const buckets = data.map(bucket => ({
        name: `Open bucket ${bucket.name}`,
        value: `https://console.cloud.google.com/storage/browser/${bucket.name}?project=${env}`,
    }));

    finalUrl = await arg('Choose a Storage bucket', [
        openList, ...buckets]);
} else if (url.type === 'secrets') {

    const data = await cache.remember('secrets', async () => {
        const secretsOutput = await exec(
            `/opt/homebrew/bin/gcloud secrets list --project=${env} --format="json"`
        );
        return JSON.parse(secretsOutput.stdout);
    })

    const secrets = data.map(secret => ({
        name: `Open secret ${secret.name.split('/').pop()}`,
        value: `https://console.cloud.google.com/security/secret-manager/secret/${secret.name.split('/').pop()}?project=${env}`,
    }));

    finalUrl = await arg('Choose a Secret', [
        openList, ...secrets]);
} else if (url.type === 'logs') {
    const data = await cache.remember('logs', async () => {
        const cloudRunInstances = await exec(`/opt/homebrew/bin/gcloud run services list --platform=managed --project=${env} --format="json"`)
        return JSON.parse(cloudRunInstances.stdout)
    });

    const instances = data.map(instance => ({
        name: `Filter by service name ${instance.metadata.name}`,
        value: `https://console.cloud.google.com/logs/query;query=resource.labels.service_name%3D%22${instance.metadata.name}%22;summaryFields=:false:32:beginning?project=${env}`,
    }))
    const open = {name: 'Open', value: finalUrl}

    finalUrl = await arg("Choose a Cloud Run instance", [open, ...instances])
} else if (url.type === 'invalidate') {
    await cache.clear()
    notify('Cache cleared')
    exit();
}

//open url in chrome in ff profile
await exec(`open -na "Google Chrome" --args --profile-directory="Profile 1" "${finalUrl}"`)
