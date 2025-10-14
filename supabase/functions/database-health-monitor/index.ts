import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { createPreflightResponse, getAllHeaders } from '../_shared/headers.ts';

interface HealthMetric {
  metric_name: string;
  metric_value: number;
  threshold_value: number;
  status: 'ok' | 'warning' | 'critical';
  message: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return createPreflightResponse(req);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const metrics: HealthMetric[] = [];

    // 1. Check backup status
    const { data: lastBackup } = await supabase
      .from('system_health_alerts')
      .select('created_at')
      .eq('alert_type', 'backup_completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const hoursSinceBackup = lastBackup 
      ? (Date.now() - new Date(lastBackup.created_at).getTime()) / 1000 / 60 / 60
      : 999;

    metrics.push({
      metric_name: 'backup_age_hours',
      metric_value: hoursSinceBackup,
      threshold_value: 25,
      status: hoursSinceBackup > 25 ? 'critical' : 'ok',
      message: `Last backup: ${hoursSinceBackup.toFixed(1)} hours ago`
    });

    // 2. Check database size
    const { data: dbSize } = await supabase.rpc('pg_database_size', { dbname: 'postgres' });
    const sizeGB = (dbSize || 0) / 1024 / 1024 / 1024;
    const quotaGB = 8; // Adjust based on plan

    metrics.push({
      metric_name: 'database_size_gb',
      metric_value: sizeGB,
      threshold_value: quotaGB * 0.8,
      status: sizeGB > quotaGB * 0.8 ? 'warning' : 'ok',
      message: `Database size: ${sizeGB.toFixed(2)} GB / ${quotaGB} GB`
    });

    // 3. Check slow queries
    const { data: slowQueries } = await supabase
      .from('pg_stat_statements')
      .select('*')
      .gte('mean_exec_time', 1000)
      .limit(5);

    metrics.push({
      metric_name: 'slow_query_count',
      metric_value: slowQueries?.length || 0,
      threshold_value: 10,
      status: (slowQueries?.length || 0) > 10 ? 'warning' : 'ok',
      message: `${slowQueries?.length || 0} slow queries detected`
    });

    // 4. Check failed webhooks
    const { count: failedWebhooks } = await supabase
      .from('webhook_events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    metrics.push({
      metric_name: 'failed_webhooks_24h',
      metric_value: failedWebhooks || 0,
      threshold_value: 5,
      status: (failedWebhooks || 0) > 5 ? 'warning' : 'ok',
      message: `${failedWebhooks} failed webhooks in 24h`
    });

    // Log critical/warning alerts
    const criticalMetrics = metrics.filter(m => m.status !== 'ok');
    
    for (const metric of criticalMetrics) {
      await supabase.from('system_health_alerts').insert({
        alert_type: `health_${metric.metric_name}`,
        severity: metric.status,
        message: metric.message,
        metric_value: metric.metric_value,
        threshold_value: metric.threshold_value,
      });
    }

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        status: criticalMetrics.length === 0 ? 'healthy' : 'degraded',
        metrics,
        alerts_triggered: criticalMetrics.length,
      }),
      { headers: { ...getAllHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Health check failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getAllHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
