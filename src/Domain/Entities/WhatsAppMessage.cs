using AtlasCRM.Domain.Common;

namespace AtlasCRM.Domain.Entities;

public sealed class WhatsAppMessage : TenantEntity
{
    public long ConversationId { get; set; }
    /// <summary>true = recebida do contato; false = enviada pelo CRM.</summary>
    public bool IsInbound { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTime SentAtUtc { get; set; } = DateTime.UtcNow;
    public string? SenderName { get; set; }

    public WhatsAppConversation? Conversation { get; set; }
}
