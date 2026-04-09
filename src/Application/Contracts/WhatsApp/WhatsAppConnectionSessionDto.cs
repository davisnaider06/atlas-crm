namespace AtlasCRM.Application.Contracts.WhatsApp;

public sealed class WhatsAppConnectionSessionDto
{
    public string InstanceName { get; set; } = string.Empty;
    public string Status { get; set; } = "Disconnected";
    public string? QrCodeBase64 { get; set; }
    public string? PairingCode { get; set; }
    public string? PhoneNumber { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
}
