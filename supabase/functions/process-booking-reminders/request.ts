export type ReminderProcessRequest = { bookingId: string | null };

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseReminderProcessRequest(
  value: unknown,
): ReminderProcessRequest | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "booking_id")) return null;
  if (!("booking_id" in input)) return { bookingId: null };
  if (typeof input.booking_id !== "string" || !UUID.test(input.booking_id)) {
    return null;
  }
  return { bookingId: input.booking_id };
}
