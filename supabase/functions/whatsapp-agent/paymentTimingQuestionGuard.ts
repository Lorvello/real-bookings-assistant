import { extractRelativeDayHint } from "./relativeDateHint.ts";
// The caller must pass successful exact-calendar
// reads and (when selected) the existing authoritative service-policy result.
export type TimingAnswer = 'online_required' | 'on_site_allowed' | 'unknown';
export type TimingCondition = {
  at: number;
  calendar_id: string;
  conversation_id: string;
  source_message: string;
  booking_clause: string;
  state: TimingAnswer;
  service_id?: string;
  declined?: boolean;
  superseded?: "withdrawn" | "changed";
  offered_slots?: PaymentSlotOffer;
  selected_slot?: {date:string;time:string;start:string;offer_at:number};
};
export function paymentTimingConditional(message: string): { bookingClause: string } | null {
  const text = message.normalize('NFKC').replace(/[’‘]/g, "'");
  const match = text.match(/^(?:\s*)([^?]+)\?\s*(?:if not|zo niet|anders)\s*[,;:]?\s*(.+)$/i);
  if (!match) return null;
  const question = match[1];
  if (!/\b(?:can i|could i|may i|kan ik|mag ik)\b/i.test(question) ||
      !/\b(?:pay|betalen|betaal)\b/i.test(question) ||
      !/\b(?:on the day|on.?site|at (?:the|my) appointment|op de dag|ter plaatse|bij (?:de|mijn) afspraak)\b/i.test(question)) return null;
  if (!/^(?:please\s+)?(?:book\b|boek\b|reserveer\b)/i.test(match[2])) return null;
  return { bookingClause: match[2].trim() };
}
export function paymentTimingAnswer(input: {
  readSucceeded: boolean;
  securePaymentsEnabled: boolean | null;
  globalRequired: boolean | null;
  timing: unknown;
  // Null means service/owner/installment evidence unresolved, never "optional".
  selectedServicePaymentRequired: boolean | null;
}): TimingAnswer {
  if (!input.readSucceeded || typeof input.securePaymentsEnabled !== 'boolean' || typeof input.globalRequired !== 'boolean') return 'unknown';
  // The enforced online requirement wins a conflicting optional timing token.
  if (input.securePaymentsEnabled && input.globalRequired) return 'online_required';
  if (input.selectedServicePaymentRequired === true) return input.securePaymentsEnabled ? 'online_required' : 'unknown';
  if (input.selectedServicePaymentRequired === null) return 'unknown';
  // Disabled secure payments do not establish what on-site methods are accepted.
  if (!input.securePaymentsEnabled) return 'unknown';
  const timing = input.timing;
  if (!Array.isArray(timing) || !timing.length || timing.some(t => t !== 'pay_now' && t !== 'pay_on_site')) return 'unknown';
  return timing.includes('pay_on_site') ? 'on_site_allowed' : 'unknown';
}
export function conditionFresh(marker: TimingCondition, calendar: string, conversation: string, now: number): boolean {
  return marker.calendar_id === calendar && marker.conversation_id === conversation &&
    Number.isFinite(marker.at) && marker.at <= now && now - marker.at < 15 * 60 * 1000;
}
export function paymentTimingReply(answer: TimingAnswer, choices: string | null, english: boolean): string {
  if (answer === 'on_site_allowed') return english
    ? 'You can pay at your appointment. Would you also like to make a booking?'
    : 'Je kunt bij je afspraak betalen. Wil je ook een afspraak maken?';
  const policy = answer === 'online_required'
    ? english ? 'Payment is required online in advance.' : 'Betaling is vooraf online verplicht.'
    : english ? "I can't confirm yet whether payment at your appointment is allowed." : 'Ik kan nog niet bevestigen of betalen bij je afspraak mogelijk is.';
  return choices ? `${policy} ${choices}` : `${policy} ${english ? 'Which service did you mean?' : 'Welke dienst bedoel je?'}`;
}
export function guardConditionalPaymentTools(
  execute: (name: string, args: Record<string, unknown>) => Promise<unknown>,
  blocked: () => boolean,
) {
  return async (name: string, args: Record<string, unknown>) => {
    if (blocked() && (name === 'book_appointment' || name === 'get_available_slots')) {
      return { error: 'payment_condition_unresolved', needs_clarification: true };
    }
    return await execute(name, args);
  };
}

export function explicitNewBooking(message: string): boolean {
  return /^(?:please\s+|graag\s+)?(?:book me|boek (?:mij|me)|ik wil (?:graag )?(?:een afspraak|boeken)|i (?:want|would like) to book)\b/i.test(message.trim()) &&
    !/\b(?:if|als|unless|tenzij|not|niet|don['’]?t)\b/i.test(message);
}
export function currentServiceChoice(message: string, services: {id:string;name:string}[]): string | null {
  const text=message.trim().toLowerCase().replace(/[.!?]+$/,'');
  const matches=services.filter(s=>text===s.name.toLowerCase());
  return matches.length===1?matches[0].id:null;
}

// Only a separately written clock following a resolved date is usable. Missing
// or compound time language stays a clarification, never a model guess.
export function conditionalRequestedSlot(clause: string, now: Date): {date:string;time:string}|null {
  const hint=extractRelativeDayHint(clause,now);
  if (!hint) return null;
  const rest=clause.slice(clause.toLowerCase().lastIndexOf(hint.matchedPhrase.toLowerCase())+hint.matchedPhrase.length);
  const clock=rest.match(/^\s*(?:(?:at|om)\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|uur)?\s*[.!]?$/i);
  if (!clock) return null;
  let hour=Number(clock[1]);const minute=Number(clock[2]??0);
  if(hour>23||minute>59)return null;
  if(clock[3]&&/^[ap]m$/i.test(clock[3])){if(hour<1||hour>12)return null;hour=hour%12+(/pm/i.test(clock[3])?12:0);}
  const weekdays=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const prefixes=['sun','mon','tue','wed','thu','fri','sat'];
  const mentioned=clause.toLowerCase().match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/);
  const day=new Date(hint.iso+'T12:00:00Z').getUTCDay();
  if(mentioned&&mentioned[1]!==weekdays[day]&&mentioned[1]!==prefixes[day])return null;
  return {date:hint.iso,time:`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`};
}

// A changed or withdrawn customer instruction retires the stored target. A bare
// confirmation can never revive it; only an explicit new booking request can.
export function paymentIntentChange(message: string, now: Date): "withdrawn" | "changed" | null {
  if (/\b(?:never mind|do not book|don['’]t book|stop|laat maar|niet boeken|boek niet|geen afspraak)\b/i.test(message)) return "withdrawn";
  if (extractRelativeDayHint(message, now) || /\b(?:instead|rather|in plaats|toch|anders)\b/i.test(message) || /\b\d{1,2}:\d{2}\b/.test(message) || /^\s*\d{1,2}(?:\s*(?:am|pm|uur))?[.!]?\s*$/i.test(message)) return "changed";
  return null;
}

// Scoped continuation for an exact time actually offered to this conversation.
export type PaymentSlotOffer = {
  at: number;
  condition_at: number;
  source_message: string;
  date: string;
  service_id: string;
  reply: string;
  slots: Array<{time:string;start:string}>;
};
export function offeredClock(message:string):string|null {
  const m=message.trim().match(/^(\d{1,2})(?::(\d{2}))?[.!]?$/);
  if(!m||+m[1]>23||+(m[2]??0)>59)return null;
  return `${m[1].padStart(2,'0')}:${(m[2]??'00').padStart(2,'0')}`;
}
export function resolveOfferedPaymentTime(input:{
  message:string; currentInboundId:string|null; now:number;
  calendar:string;conversation:string;
  marker:TimingCondition & {offered_slots?:PaymentSlotOffer};
  history:Array<{id?:string;direction:string;content:string|null;created_at:string}>;
}):{date:string;time:string;start:string}|null {
  const {marker,now}=input; const offer=marker.offered_slots;
  if(!offer || marker.declined || marker.superseded || marker.state!=='online_required' || !conditionFresh(marker,input.calendar,input.conversation,now))return null;
  if(offer.condition_at!==marker.at || offer.source_message!==marker.source_message || offer.service_id!==marker.service_id || !Number.isFinite(offer.at) || offer.at>now || now-offer.at>15*60000)return null;
  const current=input.history.at(-1),previous=input.history.at(-2);
  if(!input.currentInboundId || current?.id!==input.currentInboundId || current.direction!=='inbound' || current.content!==input.message || previous?.direction!=='outbound' || previous.content!==offer.reply)return null;
  const priorAt=Date.parse(previous.created_at),currentAt=Date.parse(current.created_at);
  if(!Number.isFinite(priorAt)||priorAt<offer.at||priorAt>now||!Number.isFinite(currentAt)||currentAt<priorAt||currentAt>now)return null;
  const time=offeredClock(input.message); if(!time)return null;
  const choices=offer.slots.filter(slot=>slot.time===time);
  return choices.length===1?{date:offer.date,time,start:choices[0].start}:null;
}
