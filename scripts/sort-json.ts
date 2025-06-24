// Name: Sort JSON

import '@johnlindquist/kit';

const text = await clipboard.readText();

try {
  const json = JSON.parse(text);

  // Sort environment variables alphabetically by name
  if (json.containerDefinitions && json.containerDefinitions.length > 0) {
    for (const container of json.containerDefinitions) {
      if (container.environment) {
        container.environment.sort((a, b) => a.name.localeCompare(b.name));
      }

      if (container.secrets) {
        container.secrets.sort((a, b) => a.name.localeCompare(b.name));
      }
    }
  }

  const sorted = JSON.stringify(json, null, 2);
  await clipboard.writeText(sorted);

  notify('JSON sorted and copied to clipboard');
} catch (e) {
  notify({
    title: 'Error sorting JSON',
    body: e.message,
  });
}
