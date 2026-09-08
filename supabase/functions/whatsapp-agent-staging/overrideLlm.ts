// LAUNCH-RUN 2026-09 / R-STAGING. DE PROVIDER/MODEL-OVERRIDE, om `llm.ts` heen.
//
// `whatsapp-agent/llm.ts` kiest zijn provider en model uit de omgeving op het moment dat
// `runAgent` wordt aangeroepen (`Deno.env.get("LLM_PROVIDER")`, `GROQ_MODEL`, ...). Dat bestand
// wordt HIER NIET AANGERAAKT: deze module wikkelt er alleen omheen, zodat de bake-off precies
// dezelfde agent-lus meet als productie.
//
// De generator herschrijft in de gegenereerde index.ts EEN importregel:
//     import { runAgent, type Content } from "./llm.ts";
//   wordt
//     import { runAgent, type Content } from "./overrideLlm.ts";
//
// HOE DE OVERRIDE WORDT TOEGEPAST, en waarom NIET met `Deno.env.set`.
// GEMETEN 2026-09-06 op de gedeployde functie: de Supabase edge-runtime weigert schrijven naar
// de omgeving met `NotSupported: The operation is not supported at Object.setEnv`. Een override
// die daarop steunt gooit dus altijd (bewijs: RSTG/P2a_eerste_poging_NotSupported_20260906.txt).
// In plaats daarvan wordt `Deno.env.get` zelf tijdelijk vervangen door een leesfunctie die voor
// LLM_PROVIDER en de model-sleutel de override teruggeeft en al het andere doorgeeft aan het
// origineel. Lezen blijft lezen; er wordt niets in de omgeving geschreven.
//
// EN HET WORDT GECONTROLEERD, NIET AANGENOMEN. Direct na het plaatsen leest deze module zelf
// terug wat `Deno.env.get("LLM_PROVIDER")` nu zegt. Klopt dat niet, dan GOOIT de override in
// plaats van stilletjes op het oude model te draaien: een bake-off-rij met het verkeerde etiket
// is erger dan een mislukte call.
//
// CONCURRENTIE. De vervanging is isolate-breed. Een override die tijdens een `await` van een
// ANDER verzoek zou wisselen, geeft dat verzoek stilzwijgend het verkeerde model. Daarom: zodra
// een verzoek een override draagt, wordt het door een slot geserialiseerd (`withOverride`), en
// `Deno.env.get` wordt na afloop altijd hersteld. Verzoeken ZONDER override lopen ongewijzigd
// en volledig parallel, precies als productie.

import { runAgent as baseRunAgent } from "../whatsapp-agent/llm.ts";
import type { AgentResult, Content, RunOpts, ToolDecl, ToolExecutor } from "../whatsapp-agent/llm.ts";
import type { OverrideProvider } from "./overrideAuth.ts";

export type { AgentResult, Content, RunOpts, ToolDecl, ToolExecutor };

const ENV_MODEL_KEY: Record<OverrideProvider, string> = {
  groq: "GROQ_MODEL",
  openai: "OPENAI_MODEL",
  gemini: "GEMINI_MODEL",
};

export interface EffectiveLlm {
  provider: string;
  model: string | null;
  source: "secrets" | "x-agent-override";
  // R4: het model van de twee veiligheidsclassifiers, apart zichtbaar. Zonder dit veld leest een
  // bake-off-rij als "op model X gemeten" terwijl 17 van de 18 calls op een ander model liepen.
  classifier_model: string | null;
  // R4-A (hervat): het GEMETEN stemaantal per classifier, zoals de functie het deze beurt las.
  // Zonder dit veld is "we hebben met N=3 gemeten" een bewering en geen aflezing.
  owner_votes: string | null;
  grounding_votes: string | null;
}

// Wat de LAATSTE agent-run in deze isolate feitelijk gebruikte. Wordt in het antwoord gezet.
let lastEffective: EffectiveLlm | null = null;

export function lastEffectiveLlm(): EffectiveLlm | null {
  return lastEffective;
}

export function currentEnvLlm(): EffectiveLlm {
  const provider = (Deno.env.get("LLM_PROVIDER") || "gemini").toLowerCase();
  const key = ENV_MODEL_KEY[provider as OverrideProvider];
  return {
    provider,
    model: key ? (Deno.env.get(key) ?? null) : null,
    source: "secrets",
    classifier_model: Deno.env.get("CLASSIFIER_MODEL") ?? null,
    owner_votes: Deno.env.get("OWNER_CLF_VOTES") ?? null,
    grounding_votes: Deno.env.get("GROUNDING_CLF_VOTES") ?? null,
  };
}

// Serialisatieslot: alleen actief voor verzoeken MET een override.
let chain: Promise<unknown> = Promise.resolve();

export async function withOverride<T>(
  ov:
    | {
      provider?: OverrideProvider;
      model?: string;
      classifierModel?: string;
      ownerVotes?: number;
      groundingVotes?: number;
    }
    | null,
  fn: () => Promise<T>,
): Promise<T> {
  // R4: een override die ALLEEN het classifier-model zet is geldig, want 17 van de 18 calls per
  // beurt zijn classifier-stemmen. De oude voorwaarde (`!ov.provider` -> niets doen) zou zo'n
  // override stil hebben genegeerd, en dat is precies de fout die deze schil moet voorkomen.
  if (!ov || (!ov.provider && !ov.classifierModel && !ov.ownerVotes && !ov.groundingVotes)) {
    lastEffective = currentEnvLlm();
    return await fn();
  }
  const run = async (): Promise<T> => {
    const modelKey = ov.provider ? ENV_MODEL_KEY[ov.provider] : null;
    const originalGet = Deno.env.get.bind(Deno.env);
    const patched = (key: string): string | undefined => {
      if (ov.provider && key === "LLM_PROVIDER") return ov.provider;
      if (ov.model && modelKey && key === modelKey) return ov.model;
      // De twee veiligheidsclassifiers lezen dit sinds R4 (ownerEscalationClassifier.ts:
      // classifierModel()). Zonder deze regel raakt een modelwissel 1 van de 18 calls.
      if (ov.classifierModel && key === "CLASSIFIER_MODEL") return ov.classifierModel;
      // R4-A (hervat): de stemknoppen. classifierVotes() leest deze twee sleutels en klemt zelf
      // op 1..20; hier wordt alleen het GELEZEN antwoord vervangen, nooit de omgeving geschreven.
      if (ov.ownerVotes && key === "OWNER_CLF_VOTES") return String(ov.ownerVotes);
      if (ov.groundingVotes && key === "GROUNDING_CLF_VOTES") return String(ov.groundingVotes);
      return originalGet(key);
    };
    let placed = false;
    try {
      // `Deno.env.set` bestaat niet op deze runtime (gemeten). `get` vervangen mag wel.
      (Deno.env as unknown as { get: (k: string) => string | undefined }).get = patched;
      placed = true;
      // TERUGLEZEN. Nooit aannemen dat de vervanging is geland.
      const seenProvider = Deno.env.get("LLM_PROVIDER");
      const seenModel = ov.model && modelKey ? Deno.env.get(modelKey) : null;
      const seenClf = ov.classifierModel ? Deno.env.get("CLASSIFIER_MODEL") : null;
      const seenOwnerV = ov.ownerVotes ? Deno.env.get("OWNER_CLF_VOTES") : null;
      const seenGrndV = ov.groundingVotes ? Deno.env.get("GROUNDING_CLF_VOTES") : null;
      if (
        (ov.provider && seenProvider !== ov.provider) ||
        (ov.model && seenModel !== ov.model) ||
        (ov.classifierModel && seenClf !== ov.classifierModel) ||
        (ov.ownerVotes && seenOwnerV !== String(ov.ownerVotes)) ||
        (ov.groundingVotes && seenGrndV !== String(ov.groundingVotes))
      ) {
        throw new Error(
          `[staging-override] de override is NIET geland (gelezen provider=${seenProvider}, ` +
            `model=${seenModel}, classifier_model=${seenClf}, owner_votes=${seenOwnerV}, ` +
            `grounding_votes=${seenGrndV}). Weigeren in plaats van op het oude model of het ` +
            `oude stemaantal draaien.`,
        );
      }
      lastEffective = {
        provider: ov.provider ?? (originalGet("LLM_PROVIDER") || "gemini").toLowerCase(),
        model: ov.model ?? (modelKey ? (originalGet(modelKey) ?? null) : null),
        source: "x-agent-override",
        classifier_model: ov.classifierModel ?? (originalGet("CLASSIFIER_MODEL") ?? null),
        owner_votes: ov.ownerVotes ? String(ov.ownerVotes) : (originalGet("OWNER_CLF_VOTES") ?? null),
        grounding_votes: ov.groundingVotes
          ? String(ov.groundingVotes)
          : (originalGet("GROUNDING_CLF_VOTES") ?? null),
      };
      console.log(
        "[staging-override-applied]",
        JSON.stringify({
          provider: lastEffective.provider,
          model: lastEffective.model,
          classifier_model: lastEffective.classifier_model,
          owner_votes: lastEffective.owner_votes,
          grounding_votes: lastEffective.grounding_votes,
        }),
      );
      return await fn();
    } finally {
      // Altijd herstellen, ook bij een worp. Een terugval mag nooit de afgewezen waarde dragen
      // (memory: a_fallback_can_carry_the_rejected_value).
      if (placed) {
        (Deno.env as unknown as { get: (k: string) => string | undefined }).get = originalGet;
      }
    }
  };
  const next = chain.then(run, run);
  chain = next.then(() => {}, () => {});
  return await next;
}

// Doorgeefluik. De agent-lus zelf blijft ongewijzigd: dit is letterlijk `llm.ts`'s runAgent.
export function runAgent(opts: RunOpts): Promise<AgentResult> {
  return baseRunAgent(opts);
}
