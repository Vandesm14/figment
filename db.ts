import { readLines } from 'https://deno.land/std@0.178.0/io/mod.ts';

export class Database<T> {
  /** The path to a JSON database file */
  path: string;

  /** An in-memory copy of the DB (auto-compacted) */
  memory: Map<string, T> = new Map();

  constructor(path: string) {
    this.path = path;

    // Create the file if it doesn't exist
    try {
      Deno.writeTextFileSync(this.path, '', { createNew: true });
    } catch {
      // File already exists
    }
  }

  async load() {
    const file = Deno.openSync(this.path);
    const lines = readLines(file);

    for await (const line of lines) {
      const { key, value } = JSON.parse(line);
      if (value !== undefined) this.memory.set(key, value);
    }
  }

  /** Compacts the database file using the in-memory copy */
  async compact() {
    const lines = [...this.memory.entries()]
      // Filter out undefined values
      .filter(([_, value]) => !!value)
      // Convert to JSON
      .map(([key, value]) => JSON.stringify({ key, value }));

    await Deno.writeTextFile(this.path, lines.join('\n'));
  }

  /** Inserts a record (auto-upserts) */
  set(key: string, value: T) {
    this.memory.set(key, value);
    Deno.writeTextFileSync(this.path, `\n${JSON.stringify({ key, value })}`, {
      append: true,
    });
  }

  /** Gets a record by key */
  get(key: string): T | undefined {
    return this.memory.get(key);
  }

  /** Lists all keys */
  list(): string[] {
    return [...this.memory.keys()];
  }

  /** Removes a record */
  delete(key: string) {
    this.set(key, undefined as any);
  }

  /** Finds a single record using a filter function */
  find(fn: (val: T) => boolean): T | undefined {
    const entries = [...this.memory.entries()];
    return entries.find(([_, value]) => fn(value))?.[1];
  }

  /** Finds all records using a filter function */
  findAll(fn: (val: T) => boolean): T[] {
    const entries = [...this.memory.entries()];
    return entries.filter(([_, value]) => fn(value)).map(([_, value]) => value);
  }

  /** Maps through all values */
  map<U>(fn: (val: T) => U): U[] {
    return [...this.memory.values()].map(fn);
  }
}
