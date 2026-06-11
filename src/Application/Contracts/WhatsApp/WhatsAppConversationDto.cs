namespace AtlasCRM.Application.Contracts.WhatsApp;

public sealed class WhatsAppConversationDto
{
    public long Id { get; init; }
    public string ContactPhone { get; init; } = string.Empty;
    public string ContactName { get; init; } = string.Empty;
    public long? LeadId { get; init; }
    public string? LeadName { get; init; }
    public string? LastMessagePreview { get; init; }
    public DateTime LastMessageAtUtc { get; init; }
    public int UnreadCount { get; init; }
}
