// ---------------------------------------------------------------------------
// i18n CI guards (Blok D0). Two checks the doctrine mandates
// (I18N_ARCHITECTURE.md "CI guards"):
//
//   (1) EN-default snapshot. Every static `t('key', 'English default')` call in
//       the source is extracted into a key -> default map and snapshotted. Since
//       there is NO en.json (the inline default IS the English source of truth),
//       this snapshot IS the EN extract: CI fails if any default string changes
//       unintentionally, forcing a deliberate `-u` and a translator follow-up.
//
//   (2) NL coverage. Every extracted key must have a value in nl/common.json or
//       nl/home.json, so "fall back to EN" is an ALLOW-LISTED state, not silent
//       rot. A `t()` key with no NL value fails the build.
//
// Only STATIC string-literal keys/defaults are scanned. Dynamic keys built with
// template literals (e.g. `t(`features.cards.${id}.name`, ...)`) are skipped by
// design (a static scan cannot resolve them); they are covered by the per-page
// harness QA. When you add such a family, add its NL keys and the harness proves
// coverage at render time.
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import nlCommon from '../locales/nl/common.json';
import nlHome from '../locales/nl/home.json';

const SRC = resolve(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip the i18n infra dir itself: its index.ts header has a `t('hero.title', ...)`
      // doc EXAMPLE that is not a real UI string and would be a false positive.
      if (entry === 'node_modules' || entry === '__tests__' || entry === 'tests' || entry === 'i18n') continue;
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

// Match `t('key', 'default')` / `t("key", "default")` (mixed quotes allowed),
// honouring escaped quotes inside each string. Backtick (template) keys/defaults
// are intentionally not matched.
const T_CALL = /\bt\(\s*(['"])((?:\\.|(?!\1).)*?)\1\s*,\s*(['"])((?:\\.|(?!\3).)*?)\3/g;

function extractDefaults(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const file of walk(SRC)) {
    const code = readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    T_CALL.lastIndex = 0;
    while ((m = T_CALL.exec(code)) !== null) {
      const key = m[2];
      // unescape \' and \" so the snapshot stores the human-readable string
      const def = m[4].replace(/\\(['"])/g, '$1');
      if (!key.includes('${')) map[key] = def;
    }
  }
  return map;
}

function flattenKeys(obj: Record<string, unknown>, prefix = '', out = new Set<string>()): Set<string> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flattenKeys(v as Record<string, unknown>, key, out);
    else out.add(key);
  }
  return out;
}

const extracted = extractDefaults();
const nlKeys = new Set<string>([
  ...flattenKeys(nlCommon as Record<string, unknown>),
  ...flattenKeys(nlHome as Record<string, unknown>),
]);

describe('i18n guard 1: EN inline-default snapshot (the EN source of truth)', () => {
  it('every t() English default is unchanged (run vitest -u to accept intended copy edits)', () => {
    // Sort for a stable, reviewable snapshot.
    const sorted = Object.fromEntries(Object.entries(extracted).sort(([a], [b]) => a.localeCompare(b)));
    expect(sorted).toMatchSnapshot();
  });

  it('found a meaningful number of translated strings (catches a broken extractor)', () => {
    expect(Object.keys(extracted).length).toBeGreaterThan(80);
  });
});

describe('i18n guard 2: NL coverage (no silent fall-back-to-EN rot)', () => {
  it('every static t() key has a Dutch value in nl/common.json or nl/home.json', () => {
    const missing = Object.keys(extracted).filter((k) => !nlKeys.has(k));
    expect(missing, `Missing NL translations for: ${missing.join(', ')}`).toEqual([]);
  });
});
