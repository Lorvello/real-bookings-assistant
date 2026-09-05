import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.19";
import { buildSetPasswordEmail } from "./setPasswordEmail.ts";

Deno.test("stored invitation name is encoded at the set-password HTML sink", () => {
  const html = buildSetPasswordEmail(
    `</p><p><a href="https://attacker.invalid">Reset here</a>`,
    "invitee@example.invalid",
    "https://auth.example.invalid/recover?token=a&next=b",
  );

  assertEquals(html.includes('<a href="https://attacker.invalid">'), false);
  assertStringIncludes(
    html,
    "&lt;/p&gt;&lt;p&gt;&lt;a href=&quot;https://attacker.invalid&quot;&gt;",
  );
  assertStringIncludes(html, "token=a&amp;next=b");
});

Deno.test("empty invitation name uses an encoded email local part", () => {
  const html = buildSetPasswordEmail(
    "",
    "o'connor@example.invalid",
    "https://auth.example.invalid/recover",
  );
  assertStringIncludes(html, "Hi o&#39;connor,");
});
