import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useBotStatus } from '@/hooks/useBotStatus';
import { useUserStatus } from '@/contexts/UserStatusContext';

export function CalendarBotSettings({ calendarId, calendarName }: { calendarId?: string; calendarName?: string }) {
  const { t } = useTranslation('settings');
  const bot = useBotStatus(calendarId);
  const { accessControl, isLoading: accessLoading } = useUserStatus();
  const isActive = bot.ready && bot.data?.whatsapp_bot_active === true;
  const accessDenied = !accessLoading && !accessControl.canAccessWhatsApp;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 space-y-1">
          <p className="text-[13px] font-medium leading-[18px] text-foreground">
            {t('settings.calendarBot.label', 'WhatsApp for {{calendar}}', { calendar: calendarName || t('settings.calendarBot.selected', 'selected calendar') })}
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            {t('settings.calendarBot.description', 'This switch only changes this calendar. Turn it on when your services and opening hours are ready. Turning it off pauses replies for this calendar.')}
          </p>
        </div>
        <Switch checked={isActive} onCheckedChange={bot.toggleBot}
          disabled={!calendarId || !bot.ready || bot.isLoading || bot.isToggling || accessLoading || (!isActive && accessDenied)}
          aria-label={t('settings.calendarBot.label', 'WhatsApp for {{calendar}}', { calendar: calendarName || t('settings.calendarBot.selected', 'selected calendar') })} />
      </div>
      <p role="status" className="text-xs leading-5 text-muted-foreground">
        {!calendarId ? t('settings.calendarBot.select', 'Select a calendar first.')
          : bot.isLoading ? t('settings.calendarBot.loading', 'Checking saved status…')
          : bot.isToggling ? t('settings.calendarBot.saving', 'Saving…')
          : !bot.ready ? t('settings.calendarBot.unavailable', 'The saved status is unavailable. Reload it before making changes.')
          : accessDenied ? t('settings.calendarBot.access', 'WhatsApp requires an eligible subscription or trial. Your saved switch setting is preserved.')
          : isActive ? t('settings.calendarBot.on', 'Enabled for this calendar. Test your WhatsApp link before sharing it.')
          : t('settings.calendarBot.off', 'Paused for this calendar. The assistant will not reply.')}
      </p>
      {bot.saveError && <p role="alert" className="text-sm text-destructive">{t('settings.calendarBot.failed', 'The change could not be saved. Check the status and try again.')}</p>}
      {calendarId && !bot.isLoading && (!bot.ready || bot.saveError) && (
        <Button variant="outline" size="sm" onClick={() => bot.refetch()}>{t('settings.calendarBot.reload', 'Reload status')}</Button>
      )}
    </div>
  );
}
