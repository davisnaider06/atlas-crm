namespace AtlasCRM.Application.Contracts.WhatsApp;

public sealed class WhatsAppMessageDto
{
    public long Id { get; init; }
    public bool IsInbound { get; init; }
    public string Text { get; init; } = string.Empty;
    public DateTime SentAtUtc { get; init; }
    public string? SenderName { get; init; }
}

public sealed class SendWhatsAppMessageRequest
{
    public string Text { get; set; } = string.Empty;
}
