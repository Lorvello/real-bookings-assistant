import { classifyHardConfirm } from "./hardConfirmGate.ts";

export function explicitNameRefusal(message: unknown): boolean {
  return /^(?:moet dat per se[?!.]?\s*)?doe maar zonder[.!]?$/i.test(String(message ?? "").trim()) || /^(?:ik wil (?:mijn )?naam niet (?:geven|delen)|liever geen naam|i (?:do not|don't) want to (?:give|share) my name)[.!]?$/i.test(String(message ?? "").trim());
}
export function affirmationInventsName(message: unknown, proposed: string, established: unknown): boolean {
  if(classifyHardConfirm(String(message ?? "")) !== "confirm") return false;
  return typeof established !== "string" || !established.trim() || proposed.trim().toLocaleLowerCase() !== established.trim().toLocaleLowerCase();
}
