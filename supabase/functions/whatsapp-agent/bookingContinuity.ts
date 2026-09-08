import {
  extractRelativeDayHint,
  type RelativeDateHint,
} from "./relativeDateHint.ts";
import { detectLanguageSignal } from "./languageSignal.ts";

type Message = {
  id?: string;
  direction: string;
  content: string | null;
  created_at: string;
  meta_timestamp?: string | null;
};
type Service = { id: string; name: string };
const STOP =
  /\b(?:annuleer\w*|cancel\w*|verzet\w*|reschedul\w*|move|afzeg\w*|laat maar|never mind|forget|nieuwe|andere|extra|new|another|second|prijs|price|cost|refund|niet|geen|not|no|nee)\b/i;
const YES = /^(?:ja(?: is goed)?|yes|ok(?:ay)?|prima|sure)[.!\s]*$/i;
const KEEP =
  /^(?:nee[, ]*|no[, ]*)?(?:laat (?:maar )?staan|laat (?:de |mijn )?afspraak staan|keep (?:it|the appointment)(?: as is)?|leave it (?:as is|unchanged))[.!\s]*$/i;
// Use row identity, never text equality to manufacture a new inbound event.
// A delayed current row cannot execute after a newer customer instruction.
function isCurrentInbound(message: string, history: Message[], now: Date, id?: string | null): boolean {
  if (!id) return false;
  const current = history.find(row => row.id === id);
  const lastInbound = history.findLast(row => row.direction === "inbound");
  if (!current || current.direction !== "inbound" || current.content !== message || lastInbound?.id !== id) return false;
  const at = Date.parse(current.meta_timestamp ?? current.created_at);
  return Number.isFinite(at) && now.getTime() - at <= 15 * 60000 && at <= now.getTime() + 1000;
}
export const KEEP_REPLY_NL = "Prima, de afspraken blijven ongewijzigd staan.";
export const KEEP_REPLY_EN = "Okay, the appointments remain unchanged.";
export function cancellationKeep(
  message: string,
  history: Message[],
  now: Date,
  currentInboundId?: string | null,
): boolean {
  if (!isCurrentInbound(message, history, now, currentInboundId)) return false;
  const rows = history.slice();
  if (
    rows.at(-1)?.direction === "inbound" && rows.at(-1)?.content === message
  ) rows.pop();
  const last = rows.at(-1);
  if (
    !last || last.direction !== "outbound" ||
    now.getTime() - Date.parse(last.created_at) > 15 * 60000
  ) return false;
  if (
    YES.test(message) &&
    [KEEP_REPLY_NL, KEEP_REPLY_EN].includes(last.content ?? "")
  ) return true;
  if (!KEEP.test(message)) return false;
  const prior = rows.slice(0, -1).at(-1);
  return prior?.direction === "inbound" &&
    /\b(?:annuleer\w*|cancel\w*|afzeg\w*)\b/i.test(prior.content ?? "") &&
    /\?|annul|cancel/i.test(last.content ?? "");
}
export interface BookingContinuation {
  hint: RelativeDateHint;
  times: string[];
  serviceId: string | null;
  name: string | null;
  language: string | null;
  confidentDutch: boolean;
}
// Reconstruct only a fresh, unfinished plain request. No outbound prose supplies
// a date, time, service or name. Any unrelated inbound ends this narrow route.
export function bookingContinuation(
  message: string,
  history: Message[],
  services: Service[],
  now: Date,
  currentInboundId?: string | null,
): BookingContinuation | null {
  if (!isCurrentInbound(message, history, now, currentInboundId)) return null;
  const rows = history;
  let draft: BookingContinuation | null = null;
  for (const row of rows) {
    if (row.direction !== "inbound") {
      if (!/\?|welke dienst|which service/i.test(row.content ?? "")) {
        draft = null;
      }
      continue;
    }
    const text = row.content ?? "";
    const at = new Date(row.meta_timestamp ?? row.created_at);
    if (
      !Number.isFinite(at.getTime()) ||
      now.getTime() - at.getTime() > 15 * 60000 ||
      at.getTime() > now.getTime() + 1000 || STOP.test(text)
    ) {
      draft = null;
      continue;
    }
    const hint = extractRelativeDayHint(text, at);
    const matches = [
      ...text.matchAll(/\b(\d{1,2})(?::([0-5]\d)|\s*(uur|u|am|pm)\b)/gi),
    ];
    let times: string[] = [];
    if (matches.length === 1) {
      let h = Number(matches[0][1]);
      const min = matches[0][2] ?? "00";
      const suffix = (matches[0][3] ?? "").toLowerCase();
      if (suffix === "pm" && h < 12) h += 12;
      if (suffix === "am" && h === 12) h = 0;
      if (h <= 23) {
        times = [`${String(h).padStart(2, "0")}:${min}`];
        if ((suffix === "uur" || suffix === "u") && h > 0 && h < 12) {
          times.push(`${h + 12}:${min}`);
        }
      }
    }
    const chosen = services.filter((s) =>
      new RegExp(`\\b${s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
        .test(text)
    );
    const signature =
      /-\s*([\p{L}][\p{L}'’-]*(?:\s+[\p{L}][\p{L}'’-]*){0,3})\s*$/u.exec(text)
        ?.[1] ?? /\?\s*([\p{L}][\p{L}'’-]*)\s*$/u.exec(text)?.[1];
    let residue = text;
    if (signature) residue = residue.slice(0, residue.lastIndexOf(signature));
    if (hint) residue = residue.replace(hint.matchedPhrase, "");
    for (const service of chosen) {
      residue = residue.replace(
        new RegExp(service.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"),
        "",
      );
    }
    residue = residue.replace(
      /\b(\d{1,2})(?::([0-5]\d)|\s*(uur|u|am|pm)\b)/gi,
      "",
    ).replace(/[^\p{L}\s]/gu, "").trim();
    if (
      hint && residue.split(/\s+/).some((word) =>
        word &&
        !/^(?:hoi|hi|hello|can|could|i|book|a|an|appointment|please|pls|kan|dat|ik|wil|graag|boeken|op|at|om|is|available|possible)$/i
          .test(word)
      )
    ) {
      draft = null;
      continue;
    }
    const shortChoice = chosen.length === 1 &&
      text.trim().toLowerCase() === chosen[0].name.toLowerCase();
    if (!hint && !times.length && !shortChoice && !YES.test(text)) {
      draft = null;
      continue;
    }
    if (hint) {
      draft = {
        hint,
        times,
        serviceId: chosen.length === 1 ? chosen[0].id : null,
        name: null,
        language: detectLanguageSignal(text).nonDutch,
        confidentDutch: detectLanguageSignal(text).confidentDutch,
      };
    } else if (draft && times.length) draft.times = times;
    if (!draft) continue;
    if (chosen.length === 1) draft.serviceId = chosen[0].id;
    else if (chosen.length > 1) {
      draft = null;
      continue;
    }
    if (
      signature &&
      !/^(?:kan|can|please|pls|graag|thanks|thank you|waarom|why|hoe|how|wanneer|when|welke|which|ja|yes|nee|no)$/i
        .test(signature)
    ) draft.name = signature;
    const lang = detectLanguageSignal(text);
    if (!shortChoice) {
      if (lang.nonDutch) {
        draft.language = lang.nonDutch;
        draft.confidentDutch = false;
      } else if (lang.confidentDutch) {
        draft.language = null;
        draft.confidentDutch = true;
      }
    }
  }
  return draft;
}
