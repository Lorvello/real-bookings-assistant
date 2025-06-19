
import { useCallback } from 'react';
import { useWhatsAppTemplates, useRenderWhatsAppTemplate, useCreateDefaultTemplates } from './useWhatsAppTemplates';
import { useQuickReplyFlows, useMatchQuickReplyFlow } from './useQuickReplyFlows';
import { TemplateKey, QuickReply } from '@/types/whatsapp';

export function useWhatsAppTemplateManager(calendarId: string, language: string = 'nl') {
  const { data: templates, isLoading: templatesLoading } = useWhatsAppTemplates(calendarId, language);
  const { data: flows, isLoading: flowsLoading } = useQuickReplyFlows(calendarId);
  const renderTemplate = useRenderWhatsAppTemplate();
  const matchFlow = useMatchQuickReplyFlow();
  const createDefaults = useCreateDefaultTemplates();

  const renderMessageTemplate = useCallback(async (
    templateKey: TemplateKey,
    variables: Record<string, any> = {}
  ) => {
    return renderTemplate.mutateAsync({
      calendarId,
      templateKey,
      variables,
      language,
    });
  }, [renderTemplate, calendarId, language]);

  const processIncomingMessage = useCallback(async (messageText: string) => {
    const flowMatch = await matchFlow.mutateAsync({
      calendarId,
      messageText,
    });

    return flowMatch;
  }, [matchFlow, calendarId]);

  const getTemplateByKey = useCallback((templateKey: TemplateKey) => {
    return templates?.find(template => template.template_key === templateKey);
  }, [templates]);

  const getQuickRepliesForTemplate = useCallback((templateKey: TemplateKey): QuickReply[] => {
    const template = getTemplateByKey(templateKey);
    return template?.quick_replies || [];
  }, [getTemplateByKey]);

  const setupDefaultTemplates = useCallback(async () => {
    return createDefaults.mutateAsync(calendarId);
  }, [createDefaults, calendarId]);

  const hasTemplates = Boolean(templates && templates.length > 0);
  const hasFlows = Boolean(flows && flows.length > 0);

  return {
    templates,
    flows,
    isLoading: templatesLoading || flowsLoading,
    renderMessageTemplate,
    processIncomingMessage,
    getTemplateByKey,
    getQuickRepliesForTemplate,
    setupDefaultTemplates,
    hasTemplates,
    hasFlows,
    templatesCount: templates?.length || 0,
    flowsCount: flows?.length || 0,
  };
}
