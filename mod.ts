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

await new Command()
  .name('figment')
  .description('A simple CLI for storing figments of knowledge')

  .default('help')
  .command('help', new HelpCommand().global())

  .command('add')
  .alias('a')
  .description('Add a new figment')
  .action(() => {
    const topic = prompt('Topic:');

    if (!topic) {
      console.error('Topic is required');
      Deno.exit(1);
    }

    const entry = prompt('Entry:') ?? '';
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
    let key: string | undefined = topic;
    if (!key)
      key = await Input.prompt({
        message: 'Topic:',
        list: true,
        suggestions: db.list(),
      });

    if (!key) {
      console.error('Topic is required');
      Deno.exit(1);
    }

    const collection = db.get(key);

    if (!collection) {
      console.error('Topic not found');
      Deno.exit(1);
    }

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
    console.log(topics);
  })

  .command('remove')
  .alias('r')
  .description('Remove a figment')
  .action(async () => {})

  .parse(Deno.args);