// Prepared only. Exact current request head, never a hypothetical entitlement question.
export function explicitCancelWithRefund(message: string): boolean {
  const text=message.normalize('NFKC').trim();
  if(!/\b(?:refund|geld terug|terugbeta\w*)\b/i.test(text))return false;
  // A trailing refund prerequisite qualifies the entire action, not just prose.
  if (/\b(?:if|als|unless|provided|as long as|mits|tenzij|op voorwaarde)\b/i.test(text)) return false;
  const request=text.split(/[,;?]/,1)[0];
  if(/\b(?:niet|geen|not|don't|do not|if|als|unless|tenzij|misschien|maybe)\b/i.test(request))return false;
  return /^(?:ik wil\s+(?:mijn|mn|m'n|de)\s+afspraak\s+(?:annuleren|afzeggen)|(?:annuleer|zeg)\s+(?:mijn|mn|m'n|de)\s+afspraak(?:\s+af)?|(?:please\s+)?cancel\s+my\s+appointment|i (?:want|would like) to cancel\s+my\s+appointment)\s*[.!]?$/i.test(request);
}
export function refundInformationOnly(message:string):boolean {
 return /\b(?:refund|geld terug|terugbeta\w*)\b/i.test(message) && !explicitCancelWithRefund(message);
}
export function unknownRefundReply(english:boolean):string {
 return english ? "I can't confirm whether you are entitled to a refund. Please check with the business." : "Ik kan niet bevestigen of je geld terugkrijgt. Vraag dit rechtstreeks aan het bedrijf.";
}
