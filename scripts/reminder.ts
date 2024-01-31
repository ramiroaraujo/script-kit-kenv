// Name: Reminder

import '@johnlindquist/kit';

const chrono = await npm('chrono-node');
const dayjs = await npm('dayjs');
// simple timer to count down and play a sound when it's done, with a notification
// ideally allow for multiple timers to be running at once

const reminder = await arg('Remind you what?');
debugger;

const when = await arg({
  placeholder: 'Remind you when?',
  hint: 'For example: in 10 minutes, in one hour',
});

const date = chrono.parseDate(when);
const milliseconds = dayjs(date).diff(dayjs());

const id = setTimeout(() => {
  notify(reminder);
}, milliseconds);

global['asdf'] = id;
