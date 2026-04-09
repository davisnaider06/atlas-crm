namespace AtlasCRM.Application.Contracts.WhatsApp;

public sealed class WhatsAppWebhookRequest
{
    public string? Event { get; set; }
    public string? PhoneNumber { get; set; }
    public string? PushName { get; set; }
    public string? MessageText { get; set; }
}
