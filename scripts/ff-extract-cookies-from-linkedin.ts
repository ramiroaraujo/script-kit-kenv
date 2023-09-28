// Name: FF Extract Cookies from LinkedIn

import '@johnlindquist/kit';
import { binPath } from '../lib/bin-helper';
import { wait } from '../../../../.kit/core/utils';
import { getEnv } from '../lib/env-helper';

const lsof = binPath('lsof');
const grep = binPath('grep');
const awk = binPath('awk');

const userDataDir = home('Library/Application Support/Google/Chrome');
const tmpDataDir = '/tmp/chrome-new-session';
const profileDir = getEnv('CHROME_PROFILE_DIR', 'Default');

await exec(`mkdir -p ${tmpDataDir}`);
await exec(`rsync -a "${userDataDir}/${profileDir}/" "/tmp/chrome-new-session/${profileDir}/"`);

await wait(200);

await exec(`open -na "Google Chrome" --args \
--user-data-dir="${tmpDataDir}" \
--profile-directory="${profileDir}" \
--remote-debugging-port=9222`);

notify('Waiting for Chrome to start...');
await wait(2000);

const { stdout: pid } = await exec(
  `${lsof} -i :9222 | ${grep} Google | ${awk} -F ' ' '{print $2}'`,
);

if (!pid) {
  notify('Could not start Chrome with remote debugging enabled. Please try again.');
  exit();
}

const { data } = await get('http://127.0.0.1:9222/json/version');

const puppeteer = await npm('puppeteer');

const browserWSEndpoint = data.webSocketDebuggerUrl;

const browser = await puppeteer.connect({ browserWSEndpoint });

const page = await browser.newPage();
await page.goto('https://www.linkedin.com/');

const cookies = (await page.cookies('https://www.linkedin.com/')).reduce((acc, { name, value }) => {
  acc[name] = { value };
  return acc;
}, {});

browser.close();

if (!cookies['li_at'] || !cookies['li_a']) {
  notify('No LinkedIn cookies found. Please log in to LinkedIn and try again.');
  exit();
}
// Construct the cookie string
const cookieString = `li_at=${cookies['li_at'].value}; li_a=${cookies['li_a'].value}`;

// Copy the string to the clipboard
await clipboard.writeText(cookieString);

// Notify the user
notify('The LinkedIn cookies have been copied to the clipboard.');
