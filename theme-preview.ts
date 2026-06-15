/**
 * Aurora Theme Preview
 * Tests: comments, strings, numbers, keywords, functions, classes,
 * interfaces, types, generics, decorators, async/await, regex, JSX-ish, enums.
 */

// ── Imports ──────────────────────────────────────────────────────────────────

import { EventEmitter } from "events";
import type { ReadonlyDeep } from "type-fest";

// ── Enums ────────────────────────────────────────────────────────────────────

enum Direction {
  North = "NORTH",
  South = "SOUTH",
  East  = "EAST",
  West  = "WEST",
}

const enum LogLevel {
  Debug = 0,
  Info  = 1,
  Warn  = 2,
  Error = 3,
}

// ── Interfaces & Types ───────────────────────────────────────────────────────

interface Coordinates {
  readonly lat: number;
  readonly lng: number;
  altitude?: number;
}

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

type Nullable<T> = T | null;
type AsyncResult<T, E = Error> = Promise<{ ok: true; value: T } | { ok: false; error: E }>;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// ── Decorators ───────────────────────────────────────────────────────────────

function singleton<T extends { new (...args: unknown[]): object }>(ctor: T): T {
  let instance: InstanceType<T> | null = null;
  return class extends ctor {
    constructor(...args: unknown[]) {
      super(...args);
      if (instance) return instance as InstanceType<T>;
      instance = this as unknown as InstanceType<T>;
    }
  } as T;
}

function log(target: object, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value as (...args: unknown[]) => unknown;
  descriptor.value = function (...args: unknown[]) {
    console.log(`[${key}] called with`, args);
    return original.apply(this, args);
  };
  return descriptor;
}

// ── Classes ───────────────────────────────────────────────────────────────────

abstract class BaseRepository<T extends { id: string }> extends EventEmitter {
  protected cache = new Map<string, T>();

  abstract findById(id: string): Promise<Nullable<T>>;

  protected store(entity: T): void {
    this.cache.set(entity.id, entity);
    this.emit("stored", entity);
  }
}

@singleton
class UserRepository extends BaseRepository<User> {
  private readonly endpoint = "https://api.example.com/users";

  @log
  async findById(id: string): Promise<Nullable<User>> {
    if (this.cache.has(id)) return this.cache.get(id)!;

    const response = await fetch(`${this.endpoint}/${id}`);
    if (!response.ok) return null;

    const user = (await response.json()) as User;
    this.store(user);
    return user;
  }

  async search(query: string): AsyncResult<Paginated<User>> {
    try {
      const params = new URLSearchParams({ q: query, page: "1" });
      const res = await fetch(`${this.endpoint}?${params}`);
      const data = (await res.json()) as Paginated<User>;
      return { ok: true, value: data };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }
}

// ── Plain object types ────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  createdAt: Date;
  meta: Record<string, unknown>;
}

// ── Generic utility functions ─────────────────────────────────────────────────

function groupBy<T>(items: T[], key: keyof T): Map<T[keyof T], T[]> {
  return items.reduce((acc, item) => {
    const groupKey = item[key];
    const group = acc.get(groupKey) ?? [];
    group.push(item);
    return acc.set(groupKey, group);
  }, new Map<T[keyof T], T[]>());
}

function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

async function retry<T>(
  fn: () => Promise<T>,
  { attempts = 3, delay = 300 }: { attempts?: number; delay?: number } = {},
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((res) => setTimeout(res, delay * 2 ** i));
    }
  }
  throw new Error("unreachable");
}

// ── Regex & string manipulation ───────────────────────────────────────────────

const EMAIL_RE = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;
const SLUG_RE  = /[^a-z0-9]+/g;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(SLUG_RE, "-")
    .replace(/^-|-$/g, "");
}

function formatTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

const greeting = formatTemplate("Hello, {{name}}! You have {{count}} messages.", {
  name: "Aurora",
  count: "42",
});

// ── Numbers & math ────────────────────────────────────────────────────────────

const PI         = 3.141_592_653_589_793;
const MAX_SAFE   = Number.MAX_SAFE_INTEGER;   // 9007199254740991
const HEX_COLOR  = 0xff_a8_c8;
const BINARY     = 0b1010_0101;
const OCTAL      = 0o755;
const FLOAT      = 1.5e-3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

// ── Control flow ──────────────────────────────────────────────────────────────

function navigate(direction: Direction, steps: number): Coordinates {
  const pos: Coordinates = { lat: 0, lng: 0 };

  switch (direction) {
    case Direction.North: return { ...pos, lat:  steps };
    case Direction.South: return { ...pos, lat: -steps };
    case Direction.East:  return { ...pos, lng:  steps };
    case Direction.West:  return { ...pos, lng: -steps };
    default: {
      const _exhaustive: never = direction;
      throw new Error(`Unknown direction: ${_exhaustive}`);
    }
  }
}

function* fibonacci(): Generator<number> {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// ── Destructuring & spread ────────────────────────────────────────────────────

const { lat, lng, altitude = 0 } = navigate(Direction.North, 10);

const users: User[] = [
  {
    id: "u_01",
    name: "Ada Lovelace",
    email: "ada@babbage.io",
    role: "admin",
    createdAt: new Date("1815-12-10"),
    meta: { plan: "pro", verified: true },
  },
  {
    id: "u_02",
    name: "Grace Hopper",
    email: "grace@navy.mil",
    role: "editor",
    createdAt: new Date("1906-12-09"),
    meta: { plan: "free", verified: false },
  },
];

const [first, ...rest] = users;
const byRole = groupBy(users, "role");

// ── Async patterns ────────────────────────────────────────────────────────────

const repo = new UserRepository();

const debouncedSearch = debounce(async (q: string) => {
  const result = await repo.search(q);
  if (result.ok) {
    const { items, total } = result.value;
    console.info(`Found ${total} users:`, items.map((u) => u.name));
  } else {
    console.error("Search failed:", result.error.message);
  }
}, 250);

// Promise chaining as alternative
retry(() => repo.findById("u_01"), { attempts: 5, delay: 100 })
  .then((user) => {
    if (!user) throw new Error("User not found");
    return { ...user, name: user.name.toUpperCase() };
  })
  .catch((err: unknown) => {
    console.warn("Gave up after retries:", (err as Error).message);
  });

// ── Type guards & assertions ──────────────────────────────────────────────────

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "email" in value &&
    EMAIL_RE.test((value as User).email)
  );
}

function assertDefined<T>(value: T | null | undefined, label: string): asserts value is T {
  if (value == null) throw new RangeError(`${label} must not be null or undefined`);
}

// ── Readonly / immutable patterns ─────────────────────────────────────────────

const CONFIG = Object.freeze({
  apiBase:     "https://api.aurora.dev/v2",
  timeout:     8_000,
  retries:     3,
  logLevel:    LogLevel.Info,
  directions:  Object.values(Direction),
} as const);

type Config = ReadonlyDeep<typeof CONFIG>;

// ── Exports ───────────────────────────────────────────────────────────────────

export type { User, Coordinates, Paginated, AsyncResult, Config };
export {
  Direction,
  LogLevel,
  UserRepository,
  groupBy,
  debounce,
  retry,
  slugify,
  isUser,
  assertDefined,
  lerp,
  clamp,
  fibonacci,
  CONFIG,
  greeting,
};
