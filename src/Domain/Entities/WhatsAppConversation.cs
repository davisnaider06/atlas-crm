using AtlasCRM.Domain.Common;

namespace AtlasCRM.Domain.Entities;

public sealed class WhatsAppConversation : TenantEntity
{
    public string ContactPhone { get; set; } = string.Empty;
    public string ContactName { get; set; } = string.Empty;
    public long? LeadId { get; set; }
    public string? LastMessagePreview { get; set; }
    public DateTime LastMessageAtUtc { get; set; } = DateTime.UtcNow;
    public int UnreadCount { get; set; }

    public Company? Company { get; set; }
    public Lead? Lead { get; set; }
    public ICollection<WhatsAppMessage> Messages { get; set; } = new List<WhatsAppMessage>();
}
