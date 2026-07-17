import { assertEquals } from "jsr:@std/assert@1";
import { sendWhatsAppTemplate } from "./whatsappSend.ts";

Deno.test("Meta template fetch is cancelled by the reminder stage signal", async () => {
  const oldToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  Deno.env.set("WHATSAPP_ACCESS_TOKEN", "contract-token");
  const parent = new AbortController();
  let providerAborted = false;
  try {
    const request = sendWhatsAppTemplate(
      "+31612345678",
      "booking_reminder",
      "nl",
      ["Klant", "Studio", "17 juli", "12:00"],
      parent.signal,
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            providerAborted = true;
            reject(new DOMException("Aborted", "AbortError"));
          }, { once: true });
        }),
    );
    parent.abort();
    const result = await request;
    assertEquals(providerAborted, true);
    assertEquals(result.ok, false);
    assertEquals(result.status, 0);
  } finally {
    if (oldToken === undefined) Deno.env.delete("WHATSAPP_ACCESS_TOKEN");
    else Deno.env.set("WHATSAPP_ACCESS_TOKEN", oldToken);
  }
});
