export interface PublicFeatureEnvironment {
  VITE_VOICEFLOW_PROJECT_ID?: string;
  VITE_WHATSAPP_NUMBER_PROVISIONING_ENABLED?: string;
  VITE_ENTERPRISE_PROFESSIONAL_SUITE_CONTRACTED?: string;
  VITE_ENTERPRISE_PREMIUM_SUPPORT_CONTRACTED?: string;
  VITE_ENTERPRISE_ADVANCED_PERMISSION_HIERARCHIES_ENABLED?: string;
  VITE_ENTERPRISE_UNLIMITED_USERS_CONTRACTED?: string;
  VITE_ENTERPRISE_CUSTOM_BRANDED_WHATSAPP_API_ENABLED?: string;
  VITE_ENTERPRISE_VERIFIED_WHATSAPP_ACCOUNT_GUARANTEED?: string;
  VITE_ENTERPRISE_VOICE_ROUTING_ENABLED?: string;
  VITE_ENTERPRISE_OMNICHANNEL_MESSAGING_ENABLED?: string;
  VITE_ENTERPRISE_REPUTATION_MANAGEMENT_ENABLED?: string;
  VITE_ENTERPRISE_99_9_UPTIME_SLA_CONTRACTED?: string;
  VITE_ENTERPRISE_GUARANTEED_RESPONSE_TIMES_CONTRACTED?: string;
  VITE_ENTERPRISE_CONTACT_RESPONSE_WITHIN_24_HOURS_STAFFED?: string;
  VITE_ENTERPRISE_DEDICATED_MANAGER_STAFFED?: string;
  VITE_ENTERPRISE_WHITE_GLOVE_ONBOARDING_STAFFED?: string;
  VITE_ENTERPRISE_INTEGRATION_CONSULTING_PROVISIONED?: string;
}

export interface PublicFeatureAvailability {
  voiceflowProjectId: string | null;
  providesWhatsAppNumber: boolean;
  enterpriseProfessionalSuite: boolean;
  enterprisePremiumSupport: boolean;
  enterpriseAdvancedPermissionHierarchies: boolean;
  enterpriseUnlimitedUsers: boolean;
  enterpriseCustomBrandedWhatsAppApi: boolean;
  enterpriseVerifiedWhatsAppAccount: boolean;
  enterpriseVoiceRouting: boolean;
  enterpriseOmnichannelMessaging: boolean;
  enterpriseReputationManagement: boolean;
  enterpriseUptimeSla: boolean;
  enterpriseGuaranteedResponseTimes: boolean;
  enterpriseContactResponseWithin24Hours: boolean;
  enterpriseDedicatedManager: boolean;
  enterpriseWhiteGloveOnboarding: boolean;
  enterpriseIntegrationConsulting: boolean;
}

export const PUBLIC_CLAIM_FLAG_KEYS = {
  providesWhatsAppNumber: 'VITE_WHATSAPP_NUMBER_PROVISIONING_ENABLED',
  enterpriseProfessionalSuite: 'VITE_ENTERPRISE_PROFESSIONAL_SUITE_CONTRACTED',
  enterprisePremiumSupport: 'VITE_ENTERPRISE_PREMIUM_SUPPORT_CONTRACTED',
  enterpriseAdvancedPermissionHierarchies:
    'VITE_ENTERPRISE_ADVANCED_PERMISSION_HIERARCHIES_ENABLED',
  enterpriseUnlimitedUsers: 'VITE_ENTERPRISE_UNLIMITED_USERS_CONTRACTED',
  enterpriseCustomBrandedWhatsAppApi:
    'VITE_ENTERPRISE_CUSTOM_BRANDED_WHATSAPP_API_ENABLED',
  enterpriseVerifiedWhatsAppAccount:
    'VITE_ENTERPRISE_VERIFIED_WHATSAPP_ACCOUNT_GUARANTEED',
  enterpriseVoiceRouting: 'VITE_ENTERPRISE_VOICE_ROUTING_ENABLED',
  enterpriseOmnichannelMessaging: 'VITE_ENTERPRISE_OMNICHANNEL_MESSAGING_ENABLED',
  enterpriseReputationManagement: 'VITE_ENTERPRISE_REPUTATION_MANAGEMENT_ENABLED',
  enterpriseUptimeSla: 'VITE_ENTERPRISE_99_9_UPTIME_SLA_CONTRACTED',
  enterpriseGuaranteedResponseTimes:
    'VITE_ENTERPRISE_GUARANTEED_RESPONSE_TIMES_CONTRACTED',
  enterpriseContactResponseWithin24Hours:
    'VITE_ENTERPRISE_CONTACT_RESPONSE_WITHIN_24_HOURS_STAFFED',
  enterpriseDedicatedManager: 'VITE_ENTERPRISE_DEDICATED_MANAGER_STAFFED',
  enterpriseWhiteGloveOnboarding: 'VITE_ENTERPRISE_WHITE_GLOVE_ONBOARDING_STAFFED',
  enterpriseIntegrationConsulting:
    'VITE_ENTERPRISE_INTEGRATION_CONSULTING_PROVISIONED',
} as const satisfies Record<
  Exclude<keyof PublicFeatureAvailability, 'voiceflowProjectId'>,
  keyof PublicFeatureEnvironment
>;

export type PublicClaimCapability = keyof typeof PUBLIC_CLAIM_FLAG_KEYS;

const isExactTrue = (value: string | undefined): boolean => value === 'true';

/**
 * Public claims fail closed. Only the exact lowercase string `true` enables a
 * capability or contract; whitespace, alternate casing, and truthy aliases do
 * not count as evidence.
 */
export const resolvePublicFeatureAvailability = (
  environment: PublicFeatureEnvironment,
): PublicFeatureAvailability => ({
  voiceflowProjectId: environment.VITE_VOICEFLOW_PROJECT_ID?.trim() || null,
  providesWhatsAppNumber: isExactTrue(
    environment.VITE_WHATSAPP_NUMBER_PROVISIONING_ENABLED,
  ),
  enterpriseProfessionalSuite: isExactTrue(
    environment.VITE_ENTERPRISE_PROFESSIONAL_SUITE_CONTRACTED,
  ),
  enterprisePremiumSupport: isExactTrue(
    environment.VITE_ENTERPRISE_PREMIUM_SUPPORT_CONTRACTED,
  ),
  enterpriseAdvancedPermissionHierarchies: isExactTrue(
    environment.VITE_ENTERPRISE_ADVANCED_PERMISSION_HIERARCHIES_ENABLED,
  ),
  enterpriseUnlimitedUsers: isExactTrue(
    environment.VITE_ENTERPRISE_UNLIMITED_USERS_CONTRACTED,
  ),
  enterpriseCustomBrandedWhatsAppApi: isExactTrue(
    environment.VITE_ENTERPRISE_CUSTOM_BRANDED_WHATSAPP_API_ENABLED,
  ),
  enterpriseVerifiedWhatsAppAccount: isExactTrue(
    environment.VITE_ENTERPRISE_VERIFIED_WHATSAPP_ACCOUNT_GUARANTEED,
  ),
  enterpriseVoiceRouting: isExactTrue(
    environment.VITE_ENTERPRISE_VOICE_ROUTING_ENABLED,
  ),
  enterpriseOmnichannelMessaging: isExactTrue(
    environment.VITE_ENTERPRISE_OMNICHANNEL_MESSAGING_ENABLED,
  ),
  enterpriseReputationManagement: isExactTrue(
    environment.VITE_ENTERPRISE_REPUTATION_MANAGEMENT_ENABLED,
  ),
  enterpriseUptimeSla: isExactTrue(
    environment.VITE_ENTERPRISE_99_9_UPTIME_SLA_CONTRACTED,
  ),
  enterpriseGuaranteedResponseTimes: isExactTrue(
    environment.VITE_ENTERPRISE_GUARANTEED_RESPONSE_TIMES_CONTRACTED,
  ),
  enterpriseContactResponseWithin24Hours: isExactTrue(
    environment.VITE_ENTERPRISE_CONTACT_RESPONSE_WITHIN_24_HOURS_STAFFED,
  ),
  enterpriseDedicatedManager: isExactTrue(
    environment.VITE_ENTERPRISE_DEDICATED_MANAGER_STAFFED,
  ),
  enterpriseWhiteGloveOnboarding: isExactTrue(
    environment.VITE_ENTERPRISE_WHITE_GLOVE_ONBOARDING_STAFFED,
  ),
  enterpriseIntegrationConsulting: isExactTrue(
    environment.VITE_ENTERPRISE_INTEGRATION_CONSULTING_PROVISIONED,
  ),
});

export const getPublicFeatureAvailability = (): PublicFeatureAvailability =>
  resolvePublicFeatureAvailability({
    VITE_VOICEFLOW_PROJECT_ID: import.meta.env.VITE_VOICEFLOW_PROJECT_ID,
    VITE_WHATSAPP_NUMBER_PROVISIONING_ENABLED:
      import.meta.env.VITE_WHATSAPP_NUMBER_PROVISIONING_ENABLED,
    VITE_ENTERPRISE_PROFESSIONAL_SUITE_CONTRACTED:
      import.meta.env.VITE_ENTERPRISE_PROFESSIONAL_SUITE_CONTRACTED,
    VITE_ENTERPRISE_PREMIUM_SUPPORT_CONTRACTED:
      import.meta.env.VITE_ENTERPRISE_PREMIUM_SUPPORT_CONTRACTED,
    VITE_ENTERPRISE_ADVANCED_PERMISSION_HIERARCHIES_ENABLED:
      import.meta.env.VITE_ENTERPRISE_ADVANCED_PERMISSION_HIERARCHIES_ENABLED,
    VITE_ENTERPRISE_UNLIMITED_USERS_CONTRACTED:
      import.meta.env.VITE_ENTERPRISE_UNLIMITED_USERS_CONTRACTED,
    VITE_ENTERPRISE_CUSTOM_BRANDED_WHATSAPP_API_ENABLED:
      import.meta.env.VITE_ENTERPRISE_CUSTOM_BRANDED_WHATSAPP_API_ENABLED,
    VITE_ENTERPRISE_VERIFIED_WHATSAPP_ACCOUNT_GUARANTEED:
      import.meta.env.VITE_ENTERPRISE_VERIFIED_WHATSAPP_ACCOUNT_GUARANTEED,
    VITE_ENTERPRISE_VOICE_ROUTING_ENABLED:
      import.meta.env.VITE_ENTERPRISE_VOICE_ROUTING_ENABLED,
    VITE_ENTERPRISE_OMNICHANNEL_MESSAGING_ENABLED:
      import.meta.env.VITE_ENTERPRISE_OMNICHANNEL_MESSAGING_ENABLED,
    VITE_ENTERPRISE_REPUTATION_MANAGEMENT_ENABLED:
      import.meta.env.VITE_ENTERPRISE_REPUTATION_MANAGEMENT_ENABLED,
    VITE_ENTERPRISE_99_9_UPTIME_SLA_CONTRACTED:
      import.meta.env.VITE_ENTERPRISE_99_9_UPTIME_SLA_CONTRACTED,
    VITE_ENTERPRISE_GUARANTEED_RESPONSE_TIMES_CONTRACTED:
      import.meta.env.VITE_ENTERPRISE_GUARANTEED_RESPONSE_TIMES_CONTRACTED,
    VITE_ENTERPRISE_CONTACT_RESPONSE_WITHIN_24_HOURS_STAFFED:
      import.meta.env.VITE_ENTERPRISE_CONTACT_RESPONSE_WITHIN_24_HOURS_STAFFED,
    VITE_ENTERPRISE_DEDICATED_MANAGER_STAFFED:
      import.meta.env.VITE_ENTERPRISE_DEDICATED_MANAGER_STAFFED,
    VITE_ENTERPRISE_WHITE_GLOVE_ONBOARDING_STAFFED:
      import.meta.env.VITE_ENTERPRISE_WHITE_GLOVE_ONBOARDING_STAFFED,
    VITE_ENTERPRISE_INTEGRATION_CONSULTING_PROVISIONED:
      import.meta.env.VITE_ENTERPRISE_INTEGRATION_CONSULTING_PROVISIONED,
  });

export type PublicEnterpriseClaimId =
  | 'proposalScope'
  | 'userAccessByAgreement'
  | 'whatsappSetupByAgreement'
  | 'supportByAgreement'
  | 'onboardingByAgreement'
  | 'provisionedWhatsAppNumber'
  | 'professionalSuite'
  | 'premiumSupport'
  | 'advancedPermissionHierarchies'
  | 'unlimitedUsers'
  | 'userManagementBundle'
  | 'customBrandedWhatsAppApi'
  | 'verifiedWhatsAppAccount'
  | 'whatsappBrandingVerificationBundle'
  | 'voiceRouting'
  | 'omnichannelMessaging'
  | 'reputationManagement'
  | 'uptimeSla'
  | 'guaranteedResponseTimes'
  | 'dedicatedManager'
  | 'slaSupportBundle'
  | 'whiteGloveOnboarding'
  | 'integrationConsulting'
  | 'whiteGloveIntegrationBundle';

interface PublicEnterpriseClaimCopy {
  defaultText: string;
  defaultTooltip: string;
}

const PUBLIC_ENTERPRISE_CLAIM_COPY: Record<
  PublicEnterpriseClaimId,
  PublicEnterpriseClaimCopy
> = {
  proposalScope: {
    defaultText: 'Tailored Enterprise proposal',
    defaultTooltip:
      'Included modules, usage limits, pricing, and delivery dates are confirmed in writing.',
  },
  userAccessByAgreement: {
    defaultText: 'User access and permissions available by agreement',
    defaultTooltip:
      'User counts, roles, and permission levels are included only when written into the proposal.',
  },
  whatsappSetupByAgreement: {
    defaultText: 'WhatsApp Business setup available by agreement',
    defaultTooltip:
      'Number ownership, API setup, branding, and Meta badge eligibility are confirmed separately. A badge is not promised.',
  },
  supportByAgreement: {
    defaultText: 'Support coverage and service targets available by agreement',
    defaultTooltip:
      'Support hours, response targets, uptime targets, and named contacts apply only when written into the signed agreement.',
  },
  onboardingByAgreement: {
    defaultText: 'Onboarding and integration scope available by agreement',
    defaultTooltip:
      'Setup, training, and third-party integration work are scoped before contracting.',
  },
  provisionedWhatsAppNumber: {
    defaultText: 'WhatsApp number provisioning included',
    defaultTooltip:
      'A WhatsApp number is provisioned as part of the contracted Enterprise scope.',
  },
  professionalSuite: {
    defaultText: 'Complete professional suite included',
    defaultTooltip: 'All Professional plan features plus enterprise-grade capabilities',
  },
  premiumSupport: {
    defaultText: 'Premium support included',
    defaultTooltip: 'Premium support applies under the contracted Enterprise support scope.',
  },
  advancedPermissionHierarchies: {
    defaultText: 'Advanced permission hierarchies',
    defaultTooltip:
      'Department hierarchies and granular roles are enabled for the contracted Enterprise workspace.',
  },
  unlimitedUsers: {
    defaultText: 'Unlimited enterprise users',
    defaultTooltip: 'The contracted Enterprise plan has no per-user limit.',
  },
  userManagementBundle: {
    defaultText: 'Unlimited enterprise user access management',
    defaultTooltip:
      'Unlimited team members with advanced role management, department hierarchies, and granular permissions',
  },
  customBrandedWhatsAppApi: {
    defaultText: 'Custom-branded WhatsApp Business API setup',
    defaultTooltip:
      'A dedicated WhatsApp Business API connection and custom branding are included in the contracted scope.',
  },
  verifiedWhatsAppAccount: {
    defaultText: 'Verified WhatsApp business account with green checkmark',
    defaultTooltip:
      'The contracted scope expressly guarantees the verified account and green checkmark claim.',
  },
  whatsappBrandingVerificationBundle: {
    defaultText: 'Dedicated WhatsApp Business API with custom branding',
    defaultTooltip:
      'Your own WhatsApp Business API connection with custom branding, verified business account, and green checkmark',
  },
  voiceRouting: {
    defaultText: 'Intelligent voice call routing & distribution',
    defaultTooltip:
      'Automated phone call management with smart routing to available team members and call recording capabilities',
  },
  omnichannelMessaging: {
    defaultText: 'Omnichannel social media DM orchestration',
    defaultTooltip:
      'Unified management of direct messages across Facebook, Instagram, Twitter, LinkedIn, and other social platforms from one dashboard',
  },
  reputationManagement: {
    defaultText: 'Advanced reputation management & review analytics',
    defaultTooltip:
      'Monitor and manage online reviews across Google, Facebook, and other platforms with automated response suggestions and reputation scoring',
  },
  uptimeSla: {
    defaultText: '99.9% uptime SLA',
    defaultTooltip: 'A 99.9% uptime commitment is included in the signed Enterprise agreement.',
  },
  guaranteedResponseTimes: {
    defaultText: 'Guaranteed support response times',
    defaultTooltip:
      'Contractual support response times are included in the signed Enterprise agreement.',
  },
  dedicatedManager: {
    defaultText: 'Dedicated account manager',
    defaultTooltip: 'A named account manager is staffed for the contracted Enterprise account.',
  },
  slaSupportBundle: {
    defaultText: 'Enterprise SLA with dedicated success management',
    defaultTooltip:
      '99.9% uptime guarantee, dedicated account manager, and enterprise-level support with guaranteed response times',
  },
  whiteGloveOnboarding: {
    defaultText: 'White-glove onboarding',
    defaultTooltip: 'Hands-on setup and staff training are included in the contracted scope.',
  },
  integrationConsulting: {
    defaultText: 'Strategic integration consulting',
    defaultTooltip:
      'Custom integration consulting is provisioned for the systems named in the agreement.',
  },
  whiteGloveIntegrationBundle: {
    defaultText: 'White-glove onboarding & strategic integration consulting',
    defaultTooltip:
      'Complete setup assistance, custom integration with existing systems, staff training, and ongoing strategic consultation',
  },
};

const BASE_ENTERPRISE_CLAIM_IDS: PublicEnterpriseClaimId[] = [
  'proposalScope',
  'userAccessByAgreement',
  'whatsappSetupByAgreement',
  'supportByAgreement',
  'onboardingByAgreement',
];

export const getPublicEnterpriseClaimIds = (
  availability: PublicFeatureAvailability,
): PublicEnterpriseClaimId[] => {
  const claimIds = [...BASE_ENTERPRISE_CLAIM_IDS];

  if (availability.providesWhatsAppNumber) claimIds.push('provisionedWhatsAppNumber');
  if (availability.enterpriseProfessionalSuite) claimIds.push('professionalSuite');
  if (availability.enterprisePremiumSupport) claimIds.push('premiumSupport');

  if (
    availability.enterpriseAdvancedPermissionHierarchies &&
    availability.enterpriseUnlimitedUsers
  ) {
    claimIds.push('userManagementBundle');
  } else {
    if (availability.enterpriseAdvancedPermissionHierarchies) {
      claimIds.push('advancedPermissionHierarchies');
    }
    if (availability.enterpriseUnlimitedUsers) claimIds.push('unlimitedUsers');
  }

  if (
    availability.enterpriseCustomBrandedWhatsAppApi &&
    availability.enterpriseVerifiedWhatsAppAccount
  ) {
    claimIds.push('whatsappBrandingVerificationBundle');
  } else {
    if (availability.enterpriseCustomBrandedWhatsAppApi) {
      claimIds.push('customBrandedWhatsAppApi');
    }
    if (availability.enterpriseVerifiedWhatsAppAccount) {
      claimIds.push('verifiedWhatsAppAccount');
    }
  }

  if (availability.enterpriseVoiceRouting) claimIds.push('voiceRouting');
  if (availability.enterpriseOmnichannelMessaging) claimIds.push('omnichannelMessaging');
  if (availability.enterpriseReputationManagement) claimIds.push('reputationManagement');

  if (
    availability.enterpriseUptimeSla &&
    availability.enterpriseGuaranteedResponseTimes &&
    availability.enterpriseDedicatedManager
  ) {
    claimIds.push('slaSupportBundle');
  } else {
    if (availability.enterpriseUptimeSla) claimIds.push('uptimeSla');
    if (availability.enterpriseGuaranteedResponseTimes) {
      claimIds.push('guaranteedResponseTimes');
    }
    if (availability.enterpriseDedicatedManager) claimIds.push('dedicatedManager');
  }

  if (
    availability.enterpriseWhiteGloveOnboarding &&
    availability.enterpriseIntegrationConsulting
  ) {
    claimIds.push('whiteGloveIntegrationBundle');
  } else {
    if (availability.enterpriseWhiteGloveOnboarding) claimIds.push('whiteGloveOnboarding');
    if (availability.enterpriseIntegrationConsulting) claimIds.push('integrationConsulting');
  }

  return claimIds;
};

export type PublicClaimTranslator = (key: string, defaultValue: string) => string;
export type PublicClaimTranslationSurface = 'home' | 'billing' | 'success';

export interface PublicClaimTranslators {
  canonical: PublicClaimTranslator;
  legacy?: PublicClaimTranslator;
  surface?: PublicClaimTranslationSurface;
}

export interface PublicEnterpriseClaim {
  id: PublicEnterpriseClaimId;
  text: string;
  tooltip: string;
  submissionValue: string;
}

const translateLegacyClaim = (
  claimId: PublicEnterpriseClaimId,
  translators: PublicClaimTranslators,
): Pick<PublicEnterpriseClaim, 'text' | 'tooltip'> | null => {
  const t = translators.legacy;
  if (!t) return null;

  if ((translators.surface ?? 'home') === 'home') {
    switch (claimId) {
      case 'professionalSuite':
        return {
          text: t('pricing.plans.enterprise.features.f1.text', 'Complete professional suite included'),
          tooltip: t('pricing.plans.enterprise.features.f1.tooltip', 'All Professional plan features plus enterprise-grade capabilities'),
        };
      case 'userManagementBundle':
        return {
          text: t('pricing.plans.enterprise.features.f2.text', 'Unlimited enterprise user access management'),
          tooltip: t('pricing.plans.enterprise.features.f2.tooltip', 'Unlimited team members with advanced role management, department hierarchies, and granular permissions'),
        };
      case 'whatsappBrandingVerificationBundle':
        return {
          text: t('pricing.plans.enterprise.features.f3.text', 'Dedicated WhatsApp Business API with custom branding'),
          tooltip: t('pricing.plans.enterprise.features.f3.tooltip', 'Your own WhatsApp Business API connection with custom branding, verified business account, and green checkmark'),
        };
      case 'voiceRouting':
        return {
          text: t('pricing.plans.enterprise.features.f4.text', 'Intelligent voice call routing & distribution'),
          tooltip: t('pricing.plans.enterprise.features.f4.tooltip', 'Automated phone call management with smart routing to available team members and call recording capabilities'),
        };
      case 'omnichannelMessaging':
        return {
          text: t('pricing.plans.enterprise.features.f5.text', 'Omnichannel social media DM orchestration'),
          tooltip: t('pricing.plans.enterprise.features.f5.tooltip', 'Unified management of direct messages across Facebook, Instagram, Twitter, LinkedIn, and other social platforms from one dashboard'),
        };
      case 'reputationManagement':
        return {
          text: t('pricing.plans.enterprise.features.f6.text', 'Advanced reputation management & review analytics'),
          tooltip: t('pricing.plans.enterprise.features.f6.tooltip', 'Monitor and manage online reviews across Google, Facebook, and other platforms with automated response suggestions and reputation scoring'),
        };
      case 'slaSupportBundle':
        return {
          text: t('pricing.plans.enterprise.features.f7.text', 'Enterprise SLA with dedicated success management'),
          tooltip: t('pricing.plans.enterprise.features.f7.tooltip', '99.9% uptime guarantee, dedicated account manager, and enterprise-level support with guaranteed response times'),
        };
      case 'whiteGloveIntegrationBundle':
        return {
          text: t('pricing.plans.enterprise.features.f8.text', 'White-glove onboarding & strategic integration consulting'),
          tooltip: t('pricing.plans.enterprise.features.f8.tooltip', 'Complete setup assistance, custom integration with existing systems, staff training, and ongoing strategic consultation'),
        };
      default:
        return null;
    }
  }

  if (translators.surface === 'billing') {
    switch (claimId) {
      case 'professionalSuite':
        return { text: t('settings.billing.planFeatures.enterprise.0', 'Complete professional suite included'), tooltip: '' };
      case 'userManagementBundle':
        return { text: t('settings.billing.planFeatures.enterprise.1', 'Unlimited enterprise user access management'), tooltip: '' };
      case 'whatsappBrandingVerificationBundle':
        return { text: t('settings.billing.planFeatures.enterprise.2', 'Dedicated WhatsApp Business API with custom branding'), tooltip: '' };
      case 'voiceRouting':
        return { text: t('settings.billing.planFeatures.enterprise.3', 'Intelligent voice call routing & distribution'), tooltip: '' };
      case 'omnichannelMessaging':
        return { text: t('settings.billing.planFeatures.enterprise.4', 'Omnichannel social media DM orchestration'), tooltip: '' };
      case 'reputationManagement':
        return { text: t('settings.billing.planFeatures.enterprise.5', 'Advanced reputation management & review analytics'), tooltip: '' };
      case 'slaSupportBundle':
        return { text: t('settings.billing.planFeatures.enterprise.6', 'Enterprise SLA with dedicated success management'), tooltip: '' };
      case 'whiteGloveIntegrationBundle':
        return { text: t('settings.billing.planFeatures.enterprise.7', 'White-glove onboarding & strategic integration consulting'), tooltip: '' };
      default:
        return null;
    }
  }

  switch (claimId) {
    case 'professionalSuite':
      return { text: t('payment.subscription.features.enterprise.f1', 'Complete professional suite included'), tooltip: '' };
    case 'whatsappBrandingVerificationBundle':
      return { text: t('payment.subscription.features.enterprise.f2', 'Dedicated WhatsApp Business API with custom branding'), tooltip: '' };
    case 'voiceRouting':
      return { text: t('payment.subscription.features.enterprise.f3', 'Intelligent voice call routing & distribution'), tooltip: '' };
    case 'omnichannelMessaging':
      return { text: t('payment.subscription.features.enterprise.f4', 'Omnichannel social media DM orchestration'), tooltip: '' };
    case 'reputationManagement':
      return { text: t('payment.subscription.features.enterprise.f5', 'Advanced reputation management & review analytics'), tooltip: '' };
    case 'slaSupportBundle':
      return { text: t('payment.subscription.features.enterprise.f6', 'Enterprise SLA with dedicated success management'), tooltip: '' };
    case 'whiteGloveIntegrationBundle':
      return { text: t('payment.subscription.features.enterprise.f7', 'White-glove onboarding & strategic integration consulting'), tooltip: '' };
    default:
      return null;
  }
};

export const getPublicEnterpriseClaims = (
  availability: PublicFeatureAvailability,
  translators: PublicClaimTranslators,
): PublicEnterpriseClaim[] =>
  getPublicEnterpriseClaimIds(availability).map((id) => {
    const copy = PUBLIC_ENTERPRISE_CLAIM_COPY[id];
    const legacyCopy = translateLegacyClaim(id, translators);
    const canonicalKey = `pricing.plans.enterprise.claims.${id}`;

    return {
      id,
      text:
        legacyCopy?.text ??
        translators.canonical(`${canonicalKey}.text`, copy.defaultText),
      tooltip:
        legacyCopy?.tooltip ||
        translators.canonical(`${canonicalKey}.tooltip`, copy.defaultTooltip),
      submissionValue: copy.defaultText,
    };
  });

export const getPublicEnterpriseDescription = (
  availability: PublicFeatureAvailability,
  translate: PublicClaimTranslator,
): string => {
  // These legacy keys are still live, but only when the support and number
  // commitments named by their copy are both explicitly enabled.
  const t = translate;
  if (availability.enterprisePremiumSupport) {
    return availability.providesWhatsAppNumber
      ? t('pricing.plans.enterprise.description', 'Complete business solution with dedicated WhatsApp number and premium support')
      : t('pricing.plans.enterprise.descriptionOwnNumber', 'Complete business solution using your WhatsApp Business number, with premium support');
  }

  return availability.providesWhatsAppNumber
    ? translate(
        'pricing.plans.enterprise.descriptionProvisioned',
        'Tailored Enterprise proposal with a provisioned WhatsApp number; scope, limits, and support are agreed in writing.',
      )
    : translate(
        'pricing.plans.enterprise.descriptionConditional',
        'Tailored Enterprise proposal using your WhatsApp Business number; scope, limits, and support are agreed in writing.',
      );
};
