export interface GeneralContactPayloadInput {
  name: string;
  email: string;
  company?: string;
  country: string;
  subject: string;
  budget?: string;
  message: string;
  requestMeeting: boolean;
  meetingDate: string | null;
  meetingTime?: string;
}

export interface EnterpriseContactPayloadInput {
  name: string;
  email: string;
  company: string;
  companyWebsite: string;
  phone?: string;
  companySize: string;
  selectedFeatures: string[];
  message?: string;
  requestMeeting: boolean;
}

export function buildGeneralContactPayload(
  submissionId: string,
  input: GeneralContactPayloadInput,
) {
  return {
    submissionId,
    formType: 'general' as const,
    ...input,
  };
}

export function buildEnterpriseContactPayload(
  submissionId: string,
  input: EnterpriseContactPayloadInput,
) {
  return {
    submissionId,
    formType: 'enterprise' as const,
    ...input,
  };
}
