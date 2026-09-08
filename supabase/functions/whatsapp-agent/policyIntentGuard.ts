// Current-message guard, never model arguments or stored confirmation markers.
// This is a bounded NL/EN speech-act check, not a general language classifier.
const ACTION_VERB =
  /\b(?:annuleren|afzeggen|verzetten|boeken|cancel(?:ling|ing)?|reschedul(?:e|ing)|book(?:ing)?)\b/;
const INFORMATION_VERB =
  /\b(?:uitleggen|vertellen|zeggen|weten|toelichten|explain|tell|know|describe|clarify)\b/;
const REQUEST_HEAD =
  /^(?:(?:please|alsjeblieft|alstublieft)\s+)?(?:(?:kun|kan|wil|wilt|kunt|zou|zouden)\s+(?:je|jij|u)|(?:could|can|would|will)\s+you|ik\s+(?:wil|wens|ga|moet)|ik\s+zou(?=[^.!?]{0,80}\b(?:graag|willen)\b)|graag|i\s+(?:want to|need to|have to|would like to)|i'd like to)\b/;
const IMPERATIVE_ACTION =
  /^(?:please\s+|graag\s+)?(?:annuleer\b|zeg\s+[^.!?;]{0,60}\baf\b|cancel\s+(?:my|the|it|that|this|her|his)\b|(?:boek|verzet|reschedule|book)\s+(?:mij|me|mijn|my|de|the|een|an?)\b)/;

type Connector = "start" | "comma" | "coordinate" | "contrast" | "temporal";

// Keep the relationship between clauses: an English infinitive such as "book"
// can be a procedure step after AND, but an independent instruction after BUT.
// Commas adjacent to a connector never erase that connector's meaning.
function* clauses(sentence: string): Generator<{ text: string; connector: Connector }> {
  let connector: Connector = "start";
  for (const part of sentence.split(/(,|\b(?:en|maar|and|but|then|dan|daarna)\b)/)) {
    const text = part.trim();
    if (!text) continue;
    if (text === ",") {
      if (connector === "start") connector = "comma";
    } else if (/^(?:maar|but)$/.test(text)) {
      connector = "contrast";
    } else if (/^(?:en|and)$/.test(text)) {
      connector = "coordinate";
    } else if (/^(?:then|dan|daarna)$/.test(text)) {
      // "and then" is one procedural continuation. Keep a preceding contrast.
      if (connector !== "contrast") connector = "temporal";
    } else {
      yield { text, connector };
      connector = "start";
    }
  }
}

export function isCancellationPolicyQuestion(message?: string): boolean {
  const text = (message ?? "").toLowerCase().normalize("NFKC")
    .replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
  if (!/\b(?:annule\w*|afzeg\w*|cancel\w*)\b/.test(text)) return false;

  let asksForInformation = false;
  // Explanation owns its continuation by default, independent of the wording
  // of a nested question. Only a closed policy/value complement permits the
  // established shared-root request ("explain the fee AND reschedule ...").
  // A complement with its own actor remains embedded even if it mentions fees.
  const closedPolicyComplement = (complement: string): boolean => {
    if (/\b(?:i|you|we|they|he|she|ik|je|jij|u|wij|zij|ze|hij)\s+\w+/.test(complement)) return false;
    if (/\b(?:if|als|whether|of|to|te)\b/.test(complement)) return false;
    const value = /\b(?:annuleringsbeleid|annuleringstermijn|beleid|policy|policies|fee\w*|cost\w*|kost\w*|price|prijs|deadline|termijn|notice)\b/;
    return value.test(complement) &&
      /^(?:(?:me|mij|ons|us)\s+)?(?:the|your|our|this|de|het|jullie|uw|dit|cancellation|annuleringsbeleid|annuleringstermijn|what|wat|how much|hoeveel|hoe lang|how long)\b/.test(complement);
  };
  const negatedClause = /\b(?:niet|not|don't|never|nooit)\b/;
  for (const sentence of text.split(/[.!?;]+/)) {
    let subordinateExplanation = false;
    let coordinatedRequest = false;
    for (const { text: clause, connector } of clauses(sentence)) {
      const head = REQUEST_HEAD.exec(clause);
      const actionAt = clause.search(ACTION_VERB);
      const informationAt = clause.search(INFORMATION_VERB);
      const informationRequest = (head && informationAt >= 0 &&
        (actionAt < 0 || informationAt < actionAt)) ||
        /^(?:please\s+)?(?:explain|tell|describe|clarify|leg|vertel)\b/.test(clause);
      if (informationRequest) {
        asksForInformation = true;
        coordinatedRequest = true;
        const information = INFORMATION_VERB.exec(clause);
        const complement = information
          ? clause.slice(information.index + information[0].length).trim()
          : clause;
        subordinateExplanation = !closedPolicyComplement(complement);
        continue;
      }
      // Also retain scope for direct process questions without "explain", e.g.
      // "How do I cancel and reschedule my appointment?".
      if (/^(?:hoe|how|wat|what|waarom|why|wanneer|when|waar|where|welke|which|if|als|whether)\b/.test(clause)) {
        subordinateExplanation = true;
        asksForInformation = true;
        continue;
      }
      if (negatedClause.test(clause)) continue;
      // A fresh request head is independent even after a procedural explanation:
      // "explain how to cancel AND CAN YOU reschedule my appointment".
      if (head && actionAt >= head[0].length) return false;
      // Contrast alone is insufficient: "but I can reschedule" is still an
      // explained possibility. A standalone, non-negated imperative after it
      // is an independent instruction; AND/THEN retain the procedure's scope.
      if (IMPERATIVE_ACTION.test(clause) &&
        (!subordinateExplanation || connector === "contrast")) return false;
      if (subordinateExplanation) continue;
      // Outside embedded explanation scope, Dutch can share the root "kun je":
      // "uitleggen wat annuleren kost en mijn afspraak verzetten naar vrijdag".
      // Parse object + infinitive + optional destination; a terminal verb is
      // neither required nor sufficient. Finite/modals belong to a dependent
      // clause, and a policy predicate ("annuleren kost ...") is no operation.
      const sharedAction = clause.match(
        /^(?:mijn|de|die)\s+afspraak\b(.*?)\b(?:annuleren|afzeggen|verzetten|boeken)\b(.*)$/,
      );
      if (coordinatedRequest && sharedAction &&
        !/\b(?:moet|moeten|kan|kunnen|mag|mogen|wil|willen|zou|zouden)\b/.test(sharedAction[1]) &&
        /^(?:\s+(?:naar|op|om|voor|to|on|at|for)\b[^.!?;]*)?$/.test(sharedAction[2].trimEnd())) {
        return false;
      }
    }
  }

  return asksForInformation ||
    (/\b(?:hoe lang|hoeveel|hoe ver|hoe laat|tot wanneer|wanneer|wat|welk\w*|mag ik|kan ik|moet ik|how|when|what|can i|do i|will i)\b/
      .test(text) &&
      /\b(?:annuleringsbeleid|annuleringstermijn|beleid|policy|policies|termijn|deadline|notice|vooraf|tevoren|voren|kosteloos|gratis|kosten|kost|cost\w*|betaal\w*|betalen|fee\w*|charge\w*|pay|free|before|advance|hoe|how|wanneer|when|kan ik|can i)\b/
        .test(text));
}
