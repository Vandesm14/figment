import { Database } from './db.ts';
import {
  Command,
  HelpCommand,
} from 'https://deno.land/x/cliffy@v0.25.7/command/mod.ts';
import { Input } from 'https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts';

interface Collection {
  entries: Entry[];
}

interface Entry {
  text: string;
  ts: number;
}

const db = new Database<Collection>('db.json');
await db.load();
await db.compact();

const promptTopic = async (initTopic?: string) => {
  const topic: string | undefined =
    initTopic ??
    (await Input.prompt({
      message: 'Topic:',
      list: true,
      suggestions: db.list(),
    }));

  if (!topic) {
    console.error('Topic is required');
    Deno.exit(1);
  }

  const collection = db.get(topic);

  if (!collection) {
    console.error('Topic not found');
    Deno.exit(1);
  }

  return { topic, collection };
};

const promptEntryIndex = async (collection: Collection, initIndex?: number) => {
  let index: number | undefined = initIndex;
  if (!index) {
    const entry: string | undefined = await Input.prompt({
      message: 'Index:',
      list: true,
      suggestions: collection.entries.map(
        (entry, i) => `${i + 1}: ${entry.text}`
      ),
    });

    if (!entry) {
      console.error('Index is required');
      Deno.exit(1);
    }

    index = parseInt(entry.split(':')[0]);
  }

  if (index === undefined) {
    console.error('Index is required');
    Deno.exit(1);
  }

  const entry = collection.entries[index - 1];

  if (!entry) {
    console.error('Entry not found');
    Deno.exit(1);
  }

  return index;
};

await new Command()
  .name('figment')
  .description('A simple CLI for storing figments of knowledge')

  .default('help')
  .command('help', new HelpCommand().global())

  .command('new')
  .alias('n')
  .description('Add a new figment')
  .arguments('[topic:string]')
  .action((_, _topic) => {
    const topic = _topic ?? prompt('Topic:');

    if (!topic) {
      console.error('Topic is required');
      Deno.exit(1);
    }

    db.set(topic, { entries: [] });
  })

  .command('add')
  .alias('a')
  .description('Add a figment')
  .arguments('[topic:string]')
  .action(async (_, _topic) => {
    const { topic } = await promptTopic(_topic);

    const entry = await Input.prompt({
      message: 'Entry:',
    });

    if (!entry) {
      console.error('Entry is required');
      Deno.exit(1);
    }

    const newEntry: Entry = { text: entry, ts: Date.now() };

    const existing = db.get(topic);
    const entries: Collection['entries'] = existing
      ? [...existing.entries, newEntry]
      : [newEntry];

    db.set(topic, { entries });
  })

  .command('get')
  .alias('g')
  .description('Get a figment')
  .arguments('[topic:string]')
  .action(async (_, topic) => {
    const { collection } = await promptTopic(topic);

    const entries = collection.entries.map(
      (entry, i) => `${i + 1}: ${entry.text}`
    );
    console.log(entries.join('\n'));
  })

  .command('list')
  .alias('l')
  .description('List all figments')
  .action(() => {
    const topics = db.list();
    console.log(topics.join('\n'));
  })

  .command('edit')
  .alias('e')
  .description('Edit a figment')
  .arguments('[topic:string] [index:number]')
  .action(async (_, _topic, _index) => {
    const { collection, topic } = await promptTopic(_topic);
    const index = await promptEntryIndex(collection, _index);

    const newText = await Input.prompt({
      message: 'Entry:',
      list: true,
      suggestions: [collection.entries[index! - 1].text],
    });

    let entries = collection.entries;
    if (newText) {
      entries = collection.entries.map((entry, i) =>
        i === index! - 1 ? { text: newText, ts: Date.now() } : entry
      );
    } else {
      // If empty, remove the entry
      entries = collection.entries.filter((_, i) => i !== index! - 1);
    }

    db.set(topic, { entries });
  })

  .command('remove')
  .alias('r')
  .description('Remove a figment entry')
  .arguments('[topic:string] [index:number]')
  .action(async (_, _topic, _index) => {
    const { collection, topic } = await promptTopic(_topic);

    const index = await promptEntryIndex(collection, _index);

    const entries = collection.entries.filter((_, i) => i !== index! - 1);
    db.set(topic, { entries });
  })

  .command('remote-item')
  .alias('ri')
  .description('Remove a figment')
  .arguments('[topic:string]')
  .action(async (_, topic) => {
    const { topic: _topic } = await promptTopic(topic);

    db.delete(_topic);
  })

  .parse(Deno.args);
