import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sources = [
  'src/components/auth/LoginForm.tsx',
  'src/components/auth/EmailVerificationPending.tsx',
  'src/hooks/useUserRegistration.tsx',
  'src/hooks/useCreateCalendar.tsx',
  'src/utils/mfaManager.ts',
];

describe('sensitive frontend logging contract', () => {
  it('does not print sessions, direct contact values, or one-time codes', () => {
    const violations: string[] = [];

    for (const path of sources) {
      const text = readFileSync(resolve(process.cwd(), path), 'utf8');
      const calls = text.match(/console\.(?:log|info|warn|error)\([^;]+\);/gs) ?? [];
      for (const call of calls) {
        if (
          /emailResult\.value|authData\.(?:session|user)|user\.email|member\.email|(?:,\s*|\$\{|:\s*)\b(?:phoneNumber|token|code|password)\b/.test(
            call,
          )
        ) {
          violations.push(`${path}: ${call.replace(/\s+/g, ' ').slice(0, 180)}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
