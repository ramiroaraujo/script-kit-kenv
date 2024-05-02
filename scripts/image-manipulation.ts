// Name: Image Manipulation

import '@johnlindquist/kit';

import '@johnlindquist/kit';
import { CacheHelper } from '../lib/cache-helper';
import { Choice, PromptConfig } from '../../../../.kit';
import { binPath } from '../lib/bin-helper';

// cache setup
const cache = await new CacheHelper('image-manipulation', 'never').init();
let last: Operation[] = cache.get('last') ?? [];
const persisted = cache.get('persisted') ?? {};
const usage = cache.get('usage') ?? {};
const timestamps = cache.get('timestamps') ?? {};

type Operation = { name: string; params: (string | number)[] };

type TransformedOperation = {
  operation: Operation[];
};
type ParamPromptConfig = PromptConfig & { options?: string[] };
type TransformValue = {
  key: string;
  type?: 'prompt' | 'run';
  parameter?: ParamPromptConfig;
  operations?: Operation[];
};
type TransformChoice = Choice & { value?: TransformValue };
type Transformation = {
  option: TransformChoice;
  function: (...params: string[]) => string | number;
};

const transformations: Transformation[] = [
  {
    option: {
      name: 'Resize',
      description: 'Resize',
      value: {
        key: 'resize',
        parameter: [
          {
            name: 'width',
            description: 'width',
            defaultValue: '300',
          },
          {
            name: 'height',
            description: 'height',
            defaultValue: '300',
          },
        ],
      },
    },
    function: (width = '300', height = '300') => `-resize ${width}x${height}`,
  },
  {
    option: {
      name: 'Rotate',
      description: 'Rotate',
      value: {
        key: 'rotate',
        parameter: [
          {
            name: 'degree',
            description: 'degree',
            defaultValue: '90',
          },
        ],
      },
    },
    function: (degree = '90') => `-rotate ${degree}`,
  },
  {
    option: {
      name: 'Crop',
      description: 'Crop',
      value: {
        key: 'crop',
        parameter: [
          {
            name: 'width',
            description: 'width',
            defaultValue: '300',
          },
          {
            name: 'height',
            description: 'height',
            defaultValue: '300',
          },
          {
            name: 'x offset',
            description: 'x offset',
            defaultValue: '0',
          },
          {
            name: 'y offset',
            description: 'y offset',
            defaultValue: '0',
          },
        ],
      },
    },
    function: (width = '300', height = '300', x = '0', y = '0') => {
      const xOffset = parseInt(x) >= 0 ? `+${x}` : x;
      const yOffset = parseInt(y) >= 0 ? `+${y}` : y;
      return `-crop ${width}x${height}${xOffset}${yOffset}`;
    },
  },
  {
    option: {
      name: 'Flip',
      description: 'Flip',
      value: {
        key: 'flip',
        parameter: [
          {
            name: 'type',
            description: 'type',
            options: ['horizontal', 'vertical'],
          },
        ],
      },
    },
    function: (type = 'horizontal') => (type === 'horizontal' ? '-flip' : '-flop'),
  },
  {
    option: {
      name: 'Convert',
      description: 'Convert',
      value: {
        key: 'convert',
        parameter: [
          {
            name: 'format',
            description: 'format',
            options: ['jpg', 'png', 'webp', 'heic'],
          },
        ],
      },
    },
    function: (format = 'jpg') => {
      imageFormat = format;
      return '';
    },
  },
];

let imageFormat = 'jpg';

// map functions to keys, with an extra manualEdit (no op) function
const functions = transformations.reduce((prev, curr) => {
  prev[curr.option.value.key] = curr.function;
  return prev;
}, {});

// map options
const options = transformations.map((o) => o.option as TransformChoice);

const camelCase = (text) =>
  text
    .split('\n')
    .map((line) =>
      line
        .replace(/[\s-_]+(\w)/g, (_, p) => p.toUpperCase())
        .replace(/^[A-Z]/, (match) => match.toLowerCase()),
    )
    .join('\n');
const reverseCamelCase = (text) =>
  text
    .split('\n')
    .map((line) =>
      line
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim(),
    )
    .join('\n');

const savedTransformations = Object.keys(persisted).map((name) => {
  return {
    name: reverseCamelCase(name),
    description: persisted[name].map(({ name }) => name).join(' > '),
    value: {
      key: name,
      type: 'run',
      operations: persisted[name],
    },
  } as TransformChoice;
});

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
];

const handleTransformation = async (text: string, transformation: TransformValue) => {
  const { key, parameter: config } = transformation;

  const processConfig = async (configItem: ParamPromptConfig, params: string[] = []) => {
    return await arg(
      {
        input: configItem.options ? '' : configItem.defaultValue,
        hint: configItem.description,
        flags: { perform: { name: 'Transform and finish', shortcut: 'cmd+enter' } },
        onEscape: async () => {
          await handleEscape(false);
        },
      },
      configItem.options ||
        ((input) => {
          try {
            return buildPreview(images, [...operations, { name: key, params: [...params, input] }]);
          } catch (e) {
            return md(`<pre>${text}</pre>`);
          }
        }),
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
  } else if (config) {
    paramValues = [await processConfig(config)];
  } else {
    paramValues = [];
  }

  // run the transformation function with the params, possible side-effects needed
  functions[key](...paramValues);

  return {
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
const imageManipulationScript = scripts.find((s) => s.command === 'image-manipulation');

// escape handler, for history undo
const handleEscape = async (stepBack: boolean) => {
  // remove or not the last operation from the list, depending on stepBack
  const passOperations = operations
    .slice(0, stepBack ? -1 : operations.length)
    .map((op) => JSON.stringify(op));
  // re-execute the script with the remaining operations
  if (operations.length > 0) {
    await run(imageManipulationScript.filePath, ...passOperations);
  }
  exit();
};

// store performed operations
let operations: Operation[] = [];

const buildPreview = (images: string[], operations: Operation[]) => {
  const map = {
    resize: (width = '...', height = '...') => `Resize to ${width}x${height}`,
    rotate: (degree = '...') => `Rotate ${degree} degrees`,
    crop: (width = '...', height = '...', x = '...', y = '...') =>
      `Crop to ${width}x${height} at ${x}, ${y}`,
    flip: (type = '...') => `Flip ${type}`,
    convert: (format = '...') => `Convert to ${format}`,
  };
  if (!operations.length) return md(`## No operations to perform yet`);
  const ops = operations.map((op) => map[op.name](...op.params) as string);
  return md(`# ${images.length} Images to Transform
  ## Operations:
${ops.map((o) => `1. ${o}`).join('\n')}
  `);
};

const images = (await getSelectedFile()).split('\n');
let commandsPreview = buildPreview(images, operations);

if (commandsPreview.trim() === '') {
  notify('Clipboard is empty or not a valid text');
  exit();
}

// if there are args, parse them as operations, init clipboardText by running them all, and clear args
if (args.length) {
  operations = args.map((arg) => {
    return JSON.parse(arg) as Operation;
  });

  commandsPreview = buildPreview(images, operations);

  args = [];
}

// eslint-disable-next-line no-constant-condition
loop: while (true) {
  let performFlag: boolean = false;
  const transformation = await arg<TransformValue>(
    {
      preview: () => {
        return commandsPreview;
      },
      placeholder: 'Choose an image transformation',
      hint: operations.length
        ? '> ' + operations.map((o) => reverseCamelCase(o.name)).join(' > ')
        : '',
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
          preview: () => {
            try {
              if (option.value.key === 'last') {
                return buildPreview(images, last);
              }
              return buildPreview(images, [...operations, { name: option.value.key, params: [] }]);
            } catch (e) {
              return buildPreview(images, operations);
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
      // perform last transformations
      commandsPreview = buildPreview(images, last);
      operations = last;
      last = [];
      break;
    }
    case 'save': {
      // ask for a name, store operations, and exit
      const transformationName = await arg('Enter a name for this transformations:');
      persisted[camelCase(transformationName)] = operations;
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
            name: reverseCamelCase(name),
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
          notify(`Transformation ${savedTransformationName} deleted`);
          exit();
        }
      } else {
        const savedTransformation = persisted[savedTransformationName];
        commandsPreview = buildPreview(images, savedTransformation);
        operations = savedTransformation;
        last = [];
      }
      break;
    }
    default: {
      const result: TransformedOperation & { perform?: boolean } = await handleTransformation(
        commandsPreview,
        transformation,
      );

      // mark to finish if cmd+enter was pressed in the params prompt
      if (!performFlag && result.perform) performFlag = true;

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

const magick = binPath('magick');
const miff = 'miff:-';
const ops = operations
  .filter((op) => op.name !== 'convert')
  .map((op) => `${magick} - ${functions[op.name].apply(null, op.params)} ${miff}`);
images.forEach((image) => {
  const name = image.split('.').slice(0, -1).join('.');
  const head = `${magick} ${image} ${miff}`;
  const tail = `${magick} - ${name}.${imageFormat}`;
  const cmd = [head, ...ops, tail].join(' | ');
  kit.exec(cmd);
});

notify({ title: 'Image Transformations Queued', message: `Converting ${images.length} images` });
