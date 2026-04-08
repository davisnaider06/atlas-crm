using AtlasCRM.Domain.Common;
using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Domain.Entities;

public sealed class WhatsAppIntegration : TenantEntity
{
    public WhatsAppProvider Provider { get; set; } = WhatsAppProvider.None;
    public string InstanceName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? WebhookUrl { get; set; }
    public string? ApiBaseUrl { get; set; }
    public string? ApiToken { get; set; }
    public bool CaptureLeadsEnabled { get; set; }
    public bool BroadcastEnabled { get; set; }
    public WhatsAppConnectionStatus Status { get; set; } = WhatsAppConnectionStatus.Disconnected;
}
