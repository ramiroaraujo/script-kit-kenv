// Name: Breath
// Schedule: */30 9-20 * * *

import '@johnlindquist/kit';

await playAudioFile(projectPath('assets/breath-notification.m4a'));
notify({ title: `Breath in, breath out. 🧘‍♂️`, subtitle: 'Take a deep breath', silent: true });
