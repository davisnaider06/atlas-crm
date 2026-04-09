namespace AtlasCRM.Domain.Enums;

public enum EventLogType
{
    AuthLogin = 1,
    LeadCreated = 2,
    LeadUpdated = 3,
    DealCreated = 4,
    DealMoved = 5,
    ActivityCreated = 6,
    AutomationCreated = 7,
    AutomationExecuted = 8,
    DealUpdated = 9,
    ActivityUpdated = 10,
    WhatsAppIntegrationUpdated = 11,
    LeadDeleted = 12,
    DealDeleted = 13,
    ActivityDeleted = 14,
    AutomationDeleted = 15,
    WhatsAppQrRequested = 16,
    WhatsAppCampaignSent = 17,
    WhatsAppLeadCaptured = 18
}
