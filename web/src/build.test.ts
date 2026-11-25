// Guards the "fully local" requirement: no network APIs anywhere in the app source.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
  });
}

describe('no network access', () => {
  it('app source never uses fetch, XMLHttpRequest, WebSocket, EventSource or sendBeacon', () => {
    const offenders = files(join(import.meta.dirname, '.')).filter((f) =>
      /\b(fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon)/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
