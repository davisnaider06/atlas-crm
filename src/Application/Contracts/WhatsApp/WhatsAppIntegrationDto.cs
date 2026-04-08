namespace AtlasCRM.Application.Contracts.WhatsApp;

public sealed class WhatsAppIntegrationDto
{
    public long Id { get; init; }
    public string Provider { get; init; } = string.Empty;
    public string InstanceName { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public string? WebhookUrl { get; init; }
    public string? ApiBaseUrl { get; init; }
    public bool CaptureLeadsEnabled { get; init; }
    public bool BroadcastEnabled { get; init; }
    public string Status { get; init; } = string.Empty;
}
