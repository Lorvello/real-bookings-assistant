import { describe, expect, it } from 'vitest';
import {
  getPublicEnterpriseClaimIds,
  getPublicEnterpriseClaims,
  getPublicEnterpriseDescription,
  PUBLIC_CLAIM_FLAG_KEYS,
  resolvePublicFeatureAvailability,
  type PublicClaimCapability,
  type PublicEnterpriseClaimId,
  type PublicFeatureEnvironment,
} from './publicFeatureAvailability';

const translateFallback = (_key: string, fallback: string): string => fallback;

const resolveWithFlag = (
  capability: PublicClaimCapability,
  value: string,
) =>
  resolvePublicFeatureAvailability({
    [PUBLIC_CLAIM_FLAG_KEYS[capability]]: value,
  } as PublicFeatureEnvironment);

const PLAN_CLAIM_BY_CAPABILITY: Partial<
  Record<PublicClaimCapability, PublicEnterpriseClaimId>
> = {
  providesWhatsAppNumber: 'provisionedWhatsAppNumber',
  enterpriseProfessionalSuite: 'professionalSuite',
  enterprisePremiumSupport: 'premiumSupport',
  enterpriseAdvancedPermissionHierarchies: 'advancedPermissionHierarchies',
  enterpriseUnlimitedUsers: 'unlimitedUsers',
  enterpriseCustomBrandedWhatsAppApi: 'customBrandedWhatsAppApi',
  enterpriseVerifiedWhatsAppAccount: 'verifiedWhatsAppAccount',
  enterpriseVoiceRouting: 'voiceRouting',
  enterpriseOmnichannelMessaging: 'omnichannelMessaging',
  enterpriseReputationManagement: 'reputationManagement',
  enterpriseUptimeSla: 'uptimeSla',
  enterpriseGuaranteedResponseTimes: 'guaranteedResponseTimes',
  enterpriseDedicatedManager: 'dedicatedManager',
  enterpriseWhiteGloveOnboarding: 'whiteGloveOnboarding',
  enterpriseIntegrationConsulting: 'integrationConsulting',
};

describe('fail-closed public feature availability', () => {
  it('defaults every public capability and contract flag to false', () => {
    const availability = resolvePublicFeatureAvailability({});

    expect(availability.voiceflowProjectId).toBeNull();
    for (const capability of Object.keys(PUBLIC_CLAIM_FLAG_KEYS) as PublicClaimCapability[]) {
      expect(availability[capability], capability).toBe(false);
    }
  });

  it('accepts only the exact lowercase string true for every flag', () => {
    const capabilities = Object.keys(PUBLIC_CLAIM_FLAG_KEYS) as PublicClaimCapability[];

    for (const capability of capabilities) {
      for (const nonExactValue of ['TRUE', 'True', '1', 'yes', ' true ', 'false', '']) {
        expect(resolveWithFlag(capability, nonExactValue)[capability], `${capability}=${nonExactValue}`).toBe(false);
      }

      const enabled = resolveWithFlag(capability, 'true');
      expect(enabled[capability], capability).toBe(true);
      for (const otherCapability of capabilities.filter((item) => item !== capability)) {
        expect(enabled[otherCapability], `${capability} must not enable ${otherCapability}`).toBe(false);
      }
    }
  });

  it('shows only conditional proposal copy when every flag is absent', () => {
    const availability = resolvePublicFeatureAvailability({});
    const claims = getPublicEnterpriseClaims(availability, {
      canonical: translateFallback,
    });
    const renderedCopy = claims.flatMap(({ text, tooltip }) => [text, tooltip]).join(' ');

    expect(claims.map(({ id }) => id)).toEqual([
      'proposalScope',
      'userAccessByAgreement',
      'whatsappSetupByAgreement',
      'supportByAgreement',
      'onboardingByAgreement',
    ]);
    expect(renderedCopy).toMatch(/available by agreement|confirmed in writing/i);
    expect(renderedCopy).not.toMatch(
      /unlimited enterprise|advanced permission hierarch|verified WhatsApp|green checkmark|99\.9%|guaranteed support response|dedicated account manager|white-glove|strategic integration consulting/i,
    );
    expect(getPublicEnterpriseDescription(availability, translateFallback)).toMatch(
      /agreed in writing/i,
    );
  });

  it('maps each exact-true plan flag to only its corresponding hard claim', () => {
    for (const [capability, expectedClaim] of Object.entries(
      PLAN_CLAIM_BY_CAPABILITY,
    ) as Array<[PublicClaimCapability, PublicEnterpriseClaimId]>) {
      const claimIds = getPublicEnterpriseClaimIds(resolveWithFlag(capability, 'true'));
      const hardClaimIds = claimIds.filter(
        (id) => ![
          'proposalScope',
          'userAccessByAgreement',
          'whatsappSetupByAgreement',
          'supportByAgreement',
          'onboardingByAgreement',
        ].includes(id),
      );

      expect(hardClaimIds, capability).toEqual([expectedClaim]);
    }
  });

  it('coalesces legacy multi-promise lines only when every constituent flag is true', () => {
    expect(getPublicEnterpriseClaimIds(resolvePublicFeatureAvailability({
      VITE_ENTERPRISE_ADVANCED_PERMISSION_HIERARCHIES_ENABLED: 'true',
      VITE_ENTERPRISE_UNLIMITED_USERS_CONTRACTED: 'true',
    }))).toContain('userManagementBundle');

    expect(getPublicEnterpriseClaimIds(resolvePublicFeatureAvailability({
      VITE_ENTERPRISE_CUSTOM_BRANDED_WHATSAPP_API_ENABLED: 'true',
      VITE_ENTERPRISE_VERIFIED_WHATSAPP_ACCOUNT_GUARANTEED: 'true',
    }))).toContain('whatsappBrandingVerificationBundle');

    expect(getPublicEnterpriseClaimIds(resolvePublicFeatureAvailability({
      VITE_ENTERPRISE_99_9_UPTIME_SLA_CONTRACTED: 'true',
      VITE_ENTERPRISE_GUARANTEED_RESPONSE_TIMES_CONTRACTED: 'true',
      VITE_ENTERPRISE_DEDICATED_MANAGER_STAFFED: 'true',
    }))).toContain('slaSupportBundle');

    expect(getPublicEnterpriseClaimIds(resolvePublicFeatureAvailability({
      VITE_ENTERPRISE_WHITE_GLOVE_ONBOARDING_STAFFED: 'true',
      VITE_ENTERPRISE_INTEGRATION_CONSULTING_PROVISIONED: 'true',
    }))).toContain('whiteGloveIntegrationBundle');
  });
});
