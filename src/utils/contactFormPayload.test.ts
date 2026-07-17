import { describe, expect, it } from 'vitest';
import {
  buildEnterpriseContactPayload,
  buildGeneralContactPayload,
} from './contactFormPayload';

const submissionId = '05e2d9bb-aac4-4d2f-a0e4-4325be1f1fc1';

describe('contact form payload contracts', () => {
  it('keeps every general-contact field and the caller-provided idempotency ID', () => {
    expect(buildGeneralContactPayload(submissionId, {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      company: 'Analytical Engines',
      country: 'nl',
      subject: 'demo',
      budget: 'professional',
      message: 'Please show me the complete booking journey.',
      requestMeeting: true,
      meetingDate: '2026-07-20',
      meetingTime: '10:00',
    })).toEqual({
      submissionId,
      formType: 'general',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      company: 'Analytical Engines',
      country: 'nl',
      subject: 'demo',
      budget: 'professional',
      message: 'Please show me the complete booking journey.',
      requestMeeting: true,
      meetingDate: '2026-07-20',
      meetingTime: '10:00',
    });
  });

  it('keeps every enterprise field instead of dropping the visible selections', () => {
    const selectedFeatures = [
      'Complete professional suite included',
      'Enterprise SLA with dedicated success management',
    ];
    expect(buildEnterpriseContactPayload(submissionId, {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      company: 'Analytical Engines',
      companyWebsite: 'https://example.com',
      phone: '+31 6 12345678',
      companySize: '51-200',
      selectedFeatures,
      message: 'We need a multi-location rollout.',
      requestMeeting: true,
    })).toEqual({
      submissionId,
      formType: 'enterprise',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      company: 'Analytical Engines',
      companyWebsite: 'https://example.com',
      phone: '+31 6 12345678',
      companySize: '51-200',
      selectedFeatures,
      message: 'We need a multi-location rollout.',
      requestMeeting: true,
    });
  });
});
