// Name: Breath
// Schedule: */30 9-20 * * *
// Exclude: true

import '@johnlindquist/kit';

await playAudioFile(projectPath('assets/breath-notification.m4a'));
notify(`Breath in, breath out. 🧘‍♂️`);
