import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppWelcomeMessageProps {
  userId: string;
}

// Default greeting shown when the business has not set its own.
// KEEP IN SYNC with the agent default DEFAULT_WHATSAPP_WELCOME in
// supabase/functions/whatsapp-agent/prompt.ts. We substitute the business name
// here so a non-technical owner sees clean text; the agent also resolves {bedrijf}.
const defaultWelcome = (businessName: string) =>
  `Hoi! 👋 Welkom bij ${businessName}. Ik ben je boekingsassistent: je kunt hier direct een afspraak maken, verzetten of annuleren. Waarmee kan ik je helpen?`;

export function WhatsAppWelcomeMessage({ userId }: WhatsAppWelcomeMessageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('ons bedrijf');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        // Business name (for the {bedrijf} default).
        const { data: userData } = await supabase
          .from('users')
          .select('business_name')
          .eq('id', userId)
          .single();
        const name = userData?.business_name || 'ons bedrijf';
        setBusinessName(name);

        // The business's primary calendar (most have one).
        const { data: cals } = await supabase
          .from('calendars')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1);
        const cid = cals?.[0]?.id ?? null;
        setCalendarId(cid);

        // Existing custom welcome (NULL → show the default template).
        if (cid) {
          const { data: cs } = await supabase
            .from('calendar_settings')
            .select('whatsapp_welcome_message')
            .eq('calendar_id', cid)
            .maybeSingle();
          setMessage(cs?.whatsapp_welcome_message?.trim() || defaultWelcome(name));
        } else {
          setMessage(defaultWelcome(name));
        }
      } catch (err) {
        console.error('Error loading welcome message:', err);
        toast.error('Could not load the welcome message');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const handleSave = async () => {
    if (!calendarId) {
      toast.error('No calendar found to save to');
      return;
    }
    setSaving(true);
    try {
      const trimmed = message.trim();
      // Empty → store NULL so the agent falls back to the default template.
      const value = trimmed.length ? trimmed : null;
      const { error } = await supabase
        .from('calendar_settings')
        .upsert({ calendar_id: calendarId, whatsapp_welcome_message: value }, { onConflict: 'calendar_id' });
      if (error) throw error;
      toast.success('Welcome message saved');
    } catch (err) {
      console.error('Error saving welcome message:', err);
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setMessage(defaultWelcome(businessName));

  return (
    <Card className="bg-card rounded-lg border border-white/[0.08] mt-6">
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="text-base text-foreground font-medium">Welcome message</h3>
          <p className="text-sm text-muted-foreground mt-1">
            The first message the assistant sends when a customer opens the chat. Leave empty to use the default message.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="welcome-message" className="text-sm text-muted-foreground">
            Your greeting
          </Label>
          <Textarea
            id="welcome-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading || saving}
            rows={4}
            maxLength={600}
            placeholder={defaultWelcome(businessName)}
            className="bg-background border-white/[0.08] text-foreground resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Tip: use <code className="px-1 rounded bg-white/[0.06]">{'{bedrijf}'}</code> to fill in your business name automatically.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={loading || saving || !calendarId}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            onClick={handleReset}
            disabled={loading || saving}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
          >
            Reset to default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
