
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppTemplate, TemplateRenderResult, TemplateKey } from '@/types/whatsapp';

export function useWhatsAppTemplates(calendarId: string, language: string = 'nl') {
  return useQuery({
    queryKey: ['whatsapp-templates', calendarId, language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('calendar_id', calendarId)
        .eq('language', language)
        .eq('is_active', true)
        .order('template_key');

      if (error) throw error;
      return (data as unknown) as WhatsAppTemplate[];
    },
    enabled: !!calendarId,
  });
}

export function useWhatsAppTemplate(calendarId: string, templateKey: TemplateKey, language: string = 'nl') {
  return useQuery({
    queryKey: ['whatsapp-template', calendarId, templateKey, language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('calendar_id', calendarId)
        .eq('template_key', templateKey)
        .eq('language', language)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return (data as unknown) as WhatsAppTemplate;
    },
    enabled: !!(calendarId && templateKey),
  });
}

export function useCreateWhatsAppTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<WhatsAppTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .insert([{
          calendar_id: template.calendar_id,
          template_key: template.template_key,
          language: template.language,
          content: template.content,
          variables: template.variables,
          quick_replies: template.quick_replies as any,
          is_active: template.is_active
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-templates', data.calendar_id, data.language] 
      });
    },
  });
}

export function useUpdateWhatsAppTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: { 
      id: string;
    } & Partial<WhatsAppTemplate>) => {
      const updateData: any = { ...updates };
      if (updates.quick_replies) {
        updateData.quick_replies = updates.quick_replies as any;
      }

      const { data, error } = await supabase
        .from('whatsapp_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-templates', data.calendar_id, data.language] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-template', data.calendar_id, data.template_key, data.language] 
      });
    },
  });
}

export function useDeleteWhatsAppTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    },
  });
}

export function useRenderWhatsAppTemplate() {
  return useMutation({
    mutationFn: async ({
      calendarId,
      templateKey,
      variables = {},
      language = 'nl'
    }: {
      calendarId: string;
      templateKey: TemplateKey;
      variables?: Record<string, any>;
      language?: string;
    }) => {
      const { data, error } = await supabase.rpc('render_whatsapp_template', {
        p_calendar_id: calendarId,
        p_template_key: templateKey,
        p_variables: variables,
        p_language: language,
      });

      if (error) throw error;
      return (data as unknown) as TemplateRenderResult;
    },
  });
}

export function useCreateDefaultTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (calendarId: string) => {
      const { error } = await supabase.rpc('create_default_whatsapp_templates', {
        p_calendar_id: calendarId,
      });

      if (error) throw error;
      return calendarId;
    },
    onSuccess: (calendarId) => {
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-templates', calendarId] 
      });
    },
  });
}
