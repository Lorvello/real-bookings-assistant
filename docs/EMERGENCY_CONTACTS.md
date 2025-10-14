# 📞 Emergency Contacts & Escalation Matrix

## Escalation Levels

### Level 1: Self-Service Recovery (0-15 minutes)
- **Action**: Follow disaster recovery runbook
- **Resources**: `docs/DISASTER_RECOVERY.md`
- **Check Status**: 
  - https://status.supabase.com
  - https://status.stripe.com

### Level 2: Engineering Team (15-60 minutes)
- **Contact**: engineering@bookingsassistant.com
- **Response Time**: 30 minutes (business hours)
- **Escalate If**: Runbook procedures fail

### Level 3: External Support (60+ minutes)
- **Supabase Support**: support@supabase.io
- **Stripe Support**: stripe.com/support/contact
- **WhatsApp Business**: business.whatsapp.com/support

### Level 4: Critical Incident (Immediate)
- **Security Breach**: security@bookingsassistant.com
- **Data Loss**: Use encrypted backup immediately
- **Legal/Compliance**: [Add if applicable]

## On-Call Schedule

**Primary**: [Engineer Name] - [Phone]  
**Secondary**: [Engineer Name] - [Phone]  
**Manager**: [Manager Name] - [Phone]

## External Vendor SLAs

- **Supabase**: Enterprise SLA (if applicable)
- **Stripe**: Standard support (24-48 hours)
- **n8n**: Community support
