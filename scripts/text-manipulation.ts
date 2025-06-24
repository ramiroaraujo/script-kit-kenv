// Name: Text Manipulation
// Description: Transform clipboard text based on user-selected options
// Shortcut: cmd+shift+x

import '@johnlindquist/kit';
import { CacheHelper } from '../lib/cache-helper';
import { Choice, PromptConfig } from '@johnlindquist/kit';
import { transformations } from '../lib/text-transformers';

// cache setup
const cache = await new CacheHelper('text-manipulation', 'never').init();
let last: Operation[] = cache.get('last') ?? [];
const persisted = cache.get('persisted') ?? {};
const usage = cache.get('usage') ?? {};
const timestamps = cache.get('timestamps') ?? {};

type Operation = { name: string; params: (string | number)[] };
type TransformedOperation = {
  text: string;
  operation: Operation[];
};
type TransformValue = {
  key: string;
  type?: 'prompt' | 'run';
  parameter?:
    | PromptConfig
    | PromptConfig[]
    | { name: string; description: string; type: 'clipboard-search' };
  operations?: Operation[];
};
type TransformChoice = Choice & { value?: TransformValue };
export type Transformation = {
  option: TransformChoice;
  function: (text: string, ...params: string[]) => Promise<string | number>;
};

// map functions to keys, with an extra manualEdit (no op) function
const functions = transformations.reduce(
  (prev, curr) => {
    prev[curr.option.value.key] = curr.function;
    return prev;
  },
  { manualEdit: async (text: string) => text },
);

const reverse = (text) =>
  text
    .split('\n')
    .map((line) =>
      line
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim(),
    )
    .join('\n');

// map options
const options = transformations.map((o) => o.option as TransformChoice);

const savedTransformations = Object.keys(persisted).map((name) => {
  return {
    name: reverse(name),
    description: persisted[name].map(({ name }) => name).join(' > '),
    value: {
      key: name,
      type: 'run',
      operations: persisted[name],
    },
  } as TransformChoice;
});

const notifyNoChanges = () => {
  notify({
    title: 'Transformed text is the same',
    subtitle: 'No changes applied',
  });
};

// main (non transform) operations
const operationOptions: TransformChoice[] = [
  {
    name: 'Select or Type a Transformation to Perform',
    disableSubmit: true,
    value: {
      key: 'init',
    },
  },
  {
    name: 'Apply Last Transformations',
    value: {
      key: 'last',
    },
  },
  {
    name: 'Perform Transformations',
    description: 'Perform transformations on the text and copy to clipboard',
    value: {
      key: 'finish',
    },
  },
  {
    name: 'Save Transformations',
    description: 'Save the current transformations under a custom name',
    value: { key: 'save' },
  },
  {
    name: 'List Saved Transformations',
    description: 'List and execute saved transformation combos',
    value: {
      key: 'listSaved',
    },
  },
  {
    name: 'Manual Edit',
    description: 'Manually edit the transformed text',
    value: {
      key: 'edit',
    },
  },
  {
    name: 'Extract with JQ',
    description: 'Extract data from JSON using JQ',
    value: {
      key: 'jq',
    },
  },
];

const handleTransformation = async (text: string, transformation: TransformValue) => {
  const { key, parameter: config } = transformation;

  // Handle special clipboard-search type
  if (config && !Array.isArray(config) && 'type' in config && config.type === 'clipboard-search') {
    const { ClipboardService } = await import('../lib/clipboard-service');
    const db = new ClipboardService();

    // Helper to get filtered clipboards (similar to merge-clipboard.ts)
    const getFilteredClipboards = async (
      filter: string,
      count?: number,
    ): Promise<{ ROWID: number; item: string }[]> => {
      if (!filter) {
        let sql = `SELECT ROWID, item
                   FROM clipboard
                   WHERE dataType = 0
                   AND item NOT LIKE '%\n%'
                   ORDER BY ROWID DESC`;
        const params: number[] = [];
        if (count) {
          sql += ` LIMIT ?`;
          params.push(count);
        }
        return db.raw(sql, params) as { ROWID: number; item: string }[];
      }

      let sql = `SELECT ROWID, item
                 FROM clipboard
                 WHERE dataType = 0
                 AND item LIKE ?
                 AND item NOT LIKE '%\n%'
                 ORDER BY ROWID DESC`;
      const params: (string | number)[] = [`%${filter}%`];
      if (count) {
        sql += ` LIMIT ?`;
        params.push(count);
      }
      return db.raw(sql, params) as { ROWID: number; item: string }[];
    };

    // Show clipboard search UI
    const selectedText = await arg(
      {
        placeholder: 'Search clipboard for text to append',
        hint: 'Type to filter clipboard items',
        flags: { perform: { name: 'Transform and finish', shortcut: 'cmd+enter' } },
        onEscape: async () => {
          db.close();
          await handleEscape(false);
        },
      },
      async (input) => {
        const items = await getFilteredClipboards(input, 10);
        return items.map((item) => ({
          name: item.item.substring(0, 80) + (item.item.length > 80 ? '...' : ''),
          value: item.item.trim(),
          preview: async () => {
            try {
              const result = await functions[key](text, item.item.trim());
              return md(`<pre>${result}</pre>`);
            } catch (e) {
              return md(`<pre>${text}</pre>`);
            }
          },
        }));
      },
    );

    db.close();

    let transform = text;
    try {
      transform = (await functions[key](text, selectedText)).toString();
    } catch (e) {
      // Handle the error
    }

    return {
      text: transform,
      operation: [
        {
          name: key,
          params: [selectedText],
        },
      ],
      perform: flag.perform,
    } as TransformedOperation & { perform: boolean };
  }

  const processConfig = async (configItem: PromptConfig, acc: string[] = []) => {
    return await arg(
      {
        input: configItem.defaultValue,
        hint: configItem.description,
        flags: { perform: { name: 'Transform and finish', shortcut: 'cmd+enter' } },
        onEscape: async () => {
          await handleEscape(false);
        },
      },
      async (input) => {
        try {
          const result = await functions[key](text, ...[...acc, input]);
          return md(`<pre>${result}</pre>`);
        } catch (e) {
          return md(`<pre>${text}</pre>`);
        }
      },
    );
  };

  const processAllConfigs = async (configs: PromptConfig[]) => {
    const results = [];
    for (const configItem of configs) {
      const result = await processConfig(configItem, results);
      results.push(result);
    }
    return results;
  };

  let paramValues;
  if (Array.isArray(config)) {
    paramValues = await processAllConfigs(config);
  } else if (config && !('type' in config && config.type === 'clipboard-search')) {
    paramValues = [await processConfig(config as PromptConfig)];
  } else {
    paramValues = [];
  }

  let transform = text; // Default to original text
  try {
    transform = (await functions[key](text, ...paramValues)).toString();
  } catch (e) {
    // Handle the error, potentially logging or falling back to the last valid transformation
  }

  return {
    text: transform,
    operation: [
      {
        name: key,
        params: paramValues,
      },
    ],
    perform: flag.perform,
  } as TransformedOperation & { perform: boolean };
};

// scripts refefences
const scripts = (await getScripts()).filter((s) => s.kenv === 'script-kit-kenv');
const jqScript = scripts.find((s) => s.command === 'extract-with-jq');
const textManipulationScript = scripts.find((s) => s.command === 'text-manipulation');

// escape handler, for history undo
const handleEscape = async (stepBack: boolean) => {
  // remove or not the last operation from the list, depending on stepBack
  const passOperations = operations
    .slice(0, stepBack ? -1 : operations.length)
    .map((op) => JSON.stringify(op));
  // re-execute the script with the remaining operations
  if (operations.length > 0) {
    await run(textManipulationScript.filePath, ...passOperations);
  }
  exit();
};

const runAllTransformations = async (input: string, operations: Operation[]) => {
  const result = { text: input, operation: [] } as TransformedOperation;
  for (const curr of operations) {
    result.text = (
      await functions[curr.name].apply(null, [result.text, ...curr.params])
    ).toString();
    result.operation.push(curr);
  }
  return result;
};

let clipboardText = await clipboard.readText();

if (clipboardText.trim() === '') {
  notify({ title: 'Clipboard is empty or not a valid text' });
  exit();
}

// store performed operations
let operations: Operation[] = [];

// if there are args, parse them as operations, init clipboardText by running them all, and clear args
if (args.length) {
  operations = args.map((arg) => {
    return JSON.parse(arg) as Operation;
  });

  clipboardText = (await runAllTransformations(clipboardText, operations)).text;

  args = [];
}

// eslint-disable-next-line no-constant-condition
loop: while (true) {
  let performFlag: boolean = false;
  const transformation = await arg<TransformValue>(
    {
      preview: () => {
        return md(`<pre>${clipboardText}</pre>`);
      },
      placeholder: 'Choose a text transformation',
      hint: operations.length ? '> ' + operations.map((o) => reverse(o.name)).join(' > ') : '',
      onEscape: async () => {
        await handleEscape(true);
      },
      flags: { perform: { name: 'Transform and finish', shortcut: 'cmd+enter' } },
    },
    [...operationOptions, ...options, ...savedTransformations]
      .map((option) => {
        // hide init if there are already operations
        if (option.value.key === 'init' && operations.length) return null;
        // hide last transformation if there is none, or already performed operations
        if (option.value.key === 'last' && (!last.length || operations.length)) return null;
        // hide finish if no operations yet
        if (option.value.key === 'finish' && !operations.length) return null;
        // hide save if no operations yet
        if (option.value.key === 'save' && !operations.length) return null;
        // hide listSaved if no saved transformations yet
        if (option.value.key === 'listSaved' && Object.keys(persisted).length === 0) return null;

        // show last transformation names in description as a trail of transformations
        if (option.value.key === 'last') {
          option.description = last.map((o) => o.name).join(' > ');
        }

        // hide jq option if text is not a valid json
        if (option.value.key === 'jq') {
          try {
            JSON.parse(clipboardText);
          } catch (e) {
            return null;
          }
        }

        return option;
      })
      .filter(Boolean)
      .sort((a, b) => {
        // hardcoded main operations on top, if they weren't filtered earlier
        if (a.value.type === 'run') return 1;
        if (b.value.type === 'run') return -1;

        if (a.value.key === 'init') return -1;
        if (b.value.key === 'init') return 1;

        if (a.value.key === 'last') return -1;
        if (b.value.key === 'last') return 1;

        if (a.value.key === 'finish') return -1;
        if (b.value.key === 'finish') return 1;

        if (a.value.key === 'save') return -1;
        if (b.value.key === 'save') return 1;

        if (a.value.key === 'listSaved') return -1;
        if (b.value.key === 'listSaved') return 1;

        if (a.value.key === 'edit') return -1;
        if (b.value.key === 'edit') return 1;

        if (a.value.key === 'jq') return -1;
        if (b.value.key === 'jq') return 1;

        // time decay sorting for the rest
        const now = Date.now();
        const timeDecay = 3600 * 24 * 7 * 1000; // Time decay in milliseconds (e.g., 1 week)

        const aCount = usage[a.value.key] || 0;
        const bCount = usage[b.value.key] || 0;

        const aTimestamp = timestamps[a.value.key] || now;
        const bTimestamp = timestamps[b.value.key] || now;

        const aDecayedCount = aCount * Math.exp(-(now - aTimestamp) / timeDecay);
        const bDecayedCount = bCount * Math.exp(-(now - bTimestamp) / timeDecay);

        return bDecayedCount - aDecayedCount;
      })
      .map((option) => {
        return {
          ...option,
          preview: async () => {
            try {
              if (option.value.key === 'last') {
                const result = await runAllTransformations(clipboardText, last);
                return md(`<pre>${result.text}</pre>`);
              }
              if (option.value['parameter']) throw '';
              const result = await functions[option.value.key](clipboardText);
              return md(`<pre>${result}</pre>`);
            } catch (e) {
              return md(`<pre>${clipboardText}</pre>`);
            }
          },
        };
      }),
  );
  if (flag.perform) performFlag = true;

  switch (transformation.key) {
    case 'finish':
      break loop;
    case 'last': {
      // perform last transformations, overwrite clipboardText and operations, and remove last from local memory
      const result = await runAllTransformations(clipboardText, last);
      clipboardText = result.text;
      operations = result.operation;
      last = [];
      break;
    }
    case 'save': {
      // ask for a name, store operations, and exit
      const transformationName = await arg('Enter a name for this transformations:');
      persisted[await functions['camelCase'](transformationName)] = operations;
      await cache.store('persisted', persisted);
      break loop;
    }
    case 'listSaved': {
      // list saved transformations, filter to selected and run; cmd+enter to delete
      const flags = { delete: { name: 'Delete', shortcut: 'cmd+enter' } };
      const savedTransformationName = await arg(
        {
          placeholder: 'Select a saved transformation to apply:',
          flags,
        },
        Object.keys(persisted).map((name) => {
          return {
            name: reverse(name),
            value: name,
          };
        }),
      );
      if (flag.delete) {
        const value = await arg('Are you sure you want to delete this transformation?', [
          'yes',
          'no',
        ]);
        if (value === 'yes') {
          delete persisted[savedTransformationName];
          await cache.store('persisted', persisted);
          notify({ title: `Transformation ${savedTransformationName} deleted`, silent: true });
          exit();
        }
      } else {
        const savedTransformation = persisted[savedTransformationName];
        const result = await runAllTransformations(clipboardText, savedTransformation);
        clipboardText = result.text;
        operations = result.operation;
        last = [];
      }
      break;
    }
    case 'jq':
      // persist current text in clipboard, run jq script, and exit
      await clipboard.writeText(clipboardText);
      await run(jqScript.filePath);
      exit();
      break;
    case 'edit': {
      await editor({
        value: clipboardText,
        onSubmit: (value) => {
          if (value === clipboardText) {
            notifyNoChanges();
            return;
          }

          clipboardText = value;
          operations.push({ name: 'manualEdit', params: [null] });
        },
      });
      break;
    }
    default: {
      const result: TransformedOperation & { perform?: boolean } =
        transformation.type === 'run'
          ? await runAllTransformations(clipboardText, transformation.operations)
          : await handleTransformation(clipboardText, transformation);

      // mark to finish if cmd+enter was pressed in the params prompt
      if (!performFlag && result.perform) performFlag = true;

      // don't transform if result is empty
      if (/^\s*$/.test(result.text)) {
        notifyNoChanges();
        break;
      }

      // don't store operation if result is the same as previous
      if (result.text === clipboardText) {
        notifyNoChanges();
        break;
      }

      clipboardText = result.text;

      // save operations
      operations.push(...result.operation);

      // store usage for sorting
      usage[transformation.key] = (usage[transformation.key] || 0) + 1;
      timestamps[transformation.key] = Date.now();
      await cache.store('usage', usage);
      await cache.store('timestamps', timestamps);
    }
  }
  // finish if cmd+enter was pressed
  if (performFlag) break;
}

// store last transformations
await cache.store('last', operations);
await clipboard.writeText(clipboardText);

notify({
  title: 'Text transformation applied!',
  subtitle: 'Text copied to clipboard',
  silent: true,
});
