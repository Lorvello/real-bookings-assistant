import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { ContactSubmission } from "./contactSubmission.ts";
import {
  ContactMeetingPersistenceError,
  type ContactMeetingRpcClient,
  recordContactMeetingDelivery,
  reserveContactMeeting,
} from "./contactMeeting.ts";

const meetingSubmission = {
  submissionId: "05e2d9bb-aac4-4d2f-a0e4-4325be1f1fc1",
  formType: "general",
  name: "Ada Lovelace",
  email: "ada@example.com",
  company: "Analytical Engines",
  country: "nl",
  subject: "demo",
  budget: "professional",
  message: "I would like to book a product demonstration.",
  requestMeeting: true,
  meetingDate: "2026-07-20",
  meetingTime: "09:00",
} satisfies ContactSubmission;

function clientReturning(
  data: unknown,
  error: { code?: string; message?: string } | null = null,
  calls?: Array<{ functionName: string; args: Record<string, unknown> }>,
): ContactMeetingRpcClient {
  return {
    rpc(functionName, args) {
      calls?.push({ functionName, args });
      return Promise.resolve({ data, error });
    },
  };
}

Deno.test("non-scheduled submissions do not touch meeting persistence", async () => {
  let calls = 0;
  const client: ContactMeetingRpcClient = {
    rpc() {
      calls += 1;
      throw new Error("RPC must not be called");
    },
  };

  const reservation = await reserveContactMeeting(client, {
    ...meetingSubmission,
    requestMeeting: false,
    meetingDate: undefined,
    meetingTime: undefined,
  });

  assertEquals(reservation, null);
  assertEquals(calls, 0);
});

Deno.test("meeting reservation sends the normalized source-bound RPC payload", async () => {
  const calls: Array<{
    functionName: string;
    args: Record<string, unknown>;
  }> = [];
  const reservation = await reserveContactMeeting(
    clientReturning(
      {
        success: true,
        meeting_id: "4d87e1f4-82cb-4544-a922-91c1ee6f92ff",
        replayed: false,
      },
      null,
      calls,
    ),
    meetingSubmission,
  );

  assertEquals(reservation, {
    submissionId: meetingSubmission.submissionId,
    meetingId: "4d87e1f4-82cb-4544-a922-91c1ee6f92ff",
    replayed: false,
  });
  assertEquals(calls[0].functionName, "reserve_contact_meeting");
  assertEquals(calls[0].args.p_submission_id, meetingSubmission.submissionId);
  assertEquals(calls[0].args.p_meeting_date, "2026-07-20");
  assertEquals(calls[0].args.p_meeting_time, "09:00");
});

Deno.test("exact meeting replays are accepted", async () => {
  const reservation = await reserveContactMeeting(
    clientReturning({
      success: true,
      meeting_id: "4d87e1f4-82cb-4544-a922-91c1ee6f92ff",
      replayed: true,
    }),
    meetingSubmission,
  );

  assertEquals(reservation?.replayed, true);
});

Deno.test("slot races are surfaced as a conflict", async () => {
  const error = await assertRejects(
    () =>
      reserveContactMeeting(
        clientReturning({
          success: false,
          error_code: "SLOT_UNAVAILABLE",
        }),
        meetingSubmission,
      ),
    ContactMeetingPersistenceError,
    "Contact meeting persistence failed",
  );
  if (!(error instanceof ContactMeetingPersistenceError)) {
    throw error;
  }
  assertEquals(error.httpStatus, 409);
  assertEquals(error.errorCode, "SLOT_UNAVAILABLE");
});

Deno.test("submission-id payload drift is surfaced as a conflict", async () => {
  const error = await assertRejects(
    () =>
      reserveContactMeeting(
        clientReturning({
          success: false,
          error_code: "IDEMPOTENCY_CONFLICT",
        }),
        meetingSubmission,
      ),
    ContactMeetingPersistenceError,
  );
  if (!(error instanceof ContactMeetingPersistenceError)) {
    throw error;
  }
  assertEquals(error.httpStatus, 409);
  assertEquals(error.errorCode, "IDEMPOTENCY_CONFLICT");
});

Deno.test("meeting delivery result is recorded with the same submission id", async () => {
  const calls: Array<{
    functionName: string;
    args: Record<string, unknown>;
  }> = [];
  await recordContactMeetingDelivery(
    clientReturning(
      {
        success: true,
        meeting_id: "4d87e1f4-82cb-4544-a922-91c1ee6f92ff",
      },
      null,
      calls,
    ),
    {
      submissionId: meetingSubmission.submissionId,
      meetingId: "4d87e1f4-82cb-4544-a922-91c1ee6f92ff",
      replayed: false,
    },
    "delivered",
    "provider-message-id",
  );

  assertEquals(calls[0].functionName, "record_contact_meeting_delivery");
  assertEquals(
    calls[0].args.p_submission_id,
    meetingSubmission.submissionId,
  );
  assertEquals(calls[0].args.p_delivery_status, "delivered");
  assertEquals(calls[0].args.p_provider_message_id, "provider-message-id");
});

Deno.test("database errors fail closed without leaking provider details", async () => {
  const error = await assertRejects(
    () =>
      reserveContactMeeting(
        clientReturning(null, {
          code: "42501",
          message: "sensitive database detail",
        }),
        meetingSubmission,
      ),
    ContactMeetingPersistenceError,
  );
  if (!(error instanceof ContactMeetingPersistenceError)) {
    throw error;
  }
  assertEquals(error.errorCode, "DATABASE_ERROR");
  assertEquals(error.message.includes("sensitive"), false);
});
