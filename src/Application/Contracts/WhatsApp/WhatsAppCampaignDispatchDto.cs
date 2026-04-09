namespace AtlasCRM.Application.Contracts.WhatsApp;

public sealed class WhatsAppCampaignDispatchDto
{
    public string Name { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? ExternalId { get; set; }
    public string? Error { get; set; }
}
