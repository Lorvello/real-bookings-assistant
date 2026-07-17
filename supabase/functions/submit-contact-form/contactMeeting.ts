import type { ContactSubmission } from "./contactSubmission.ts";

interface RpcError {
  code?: string;
  message?: string;
}

interface RpcResponse {
  data: unknown;
  error: RpcError | null;
}

export interface ContactMeetingRpcClient {
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): PromiseLike<RpcResponse>;
}

export interface ContactMeetingReservation {
  submissionId: string;
  meetingId: string;
  replayed: boolean;
}

type ContactMeetingDeliveryStatus = "delivered" | "recorded" | "failed";

export class ContactMeetingPersistenceError extends Error {
  readonly errorCode: string;
  readonly httpStatus: number;

  constructor(errorCode: string, httpStatus = 500) {
    super("Contact meeting persistence failed");
    this.name = "ContactMeetingPersistenceError";
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
  }
}

function responseRecord(data: unknown): Record<string, unknown> | null {
  return typeof data === "object" && data !== null
    ? data as Record<string, unknown>
    : null;
}

function errorStatus(errorCode: string): number {
  return [
      "IDEMPOTENCY_CONFLICT",
      "SLOT_UNAVAILABLE",
    ].includes(errorCode)
    ? 409
    : ["INVALID_DATE", "INVALID_TIME", "INVALID_PAYLOAD"].includes(errorCode)
    ? 400
    : 500;
}

export async function reserveContactMeeting(
  client: ContactMeetingRpcClient,
  submission: ContactSubmission,
): Promise<ContactMeetingReservation | null> {
  if (
    submission.formType !== "general" ||
    !submission.requestMeeting
  ) {
    return null;
  }

  if (!submission.meetingDate || !submission.meetingTime) {
    throw new ContactMeetingPersistenceError("INVALID_PAYLOAD", 400);
  }

  const { data, error } = await client.rpc("reserve_contact_meeting", {
    p_submission_id: submission.submissionId,
    p_name: submission.name,
    p_email: submission.email,
    p_company: submission.company ?? null,
    p_country: submission.country,
    p_subject: submission.subject,
    p_budget: submission.budget ?? null,
    p_message: submission.message,
    p_meeting_date: submission.meetingDate,
    p_meeting_time: submission.meetingTime,
  });

  if (error) {
    throw new ContactMeetingPersistenceError("DATABASE_ERROR");
  }

  const result = responseRecord(data);
  if (!result || result.success !== true) {
    const code = typeof result?.error_code === "string"
      ? result.error_code
      : "DATABASE_ERROR";
    throw new ContactMeetingPersistenceError(code, errorStatus(code));
  }

  if (
    typeof result.meeting_id !== "string" ||
    typeof result.replayed !== "boolean"
  ) {
    throw new ContactMeetingPersistenceError("INVALID_DATABASE_RESPONSE");
  }

  return {
    submissionId: submission.submissionId,
    meetingId: result.meeting_id,
    replayed: result.replayed,
  };
}

export async function recordContactMeetingDelivery(
  client: ContactMeetingRpcClient,
  reservation: ContactMeetingReservation | null,
  deliveryStatus: ContactMeetingDeliveryStatus,
  providerMessageId: string | null,
): Promise<void> {
  if (!reservation) return;

  const { data, error } = await client.rpc(
    "record_contact_meeting_delivery",
    {
      p_submission_id: reservation.submissionId,
      p_delivery_status: deliveryStatus,
      p_provider_message_id: providerMessageId,
    },
  );

  if (error) {
    throw new ContactMeetingPersistenceError("DATABASE_ERROR");
  }

  const result = responseRecord(data);
  if (!result || result.success !== true) {
    const code = typeof result?.error_code === "string"
      ? result.error_code
      : "INVALID_DATABASE_RESPONSE";
    throw new ContactMeetingPersistenceError(code);
  }
}
