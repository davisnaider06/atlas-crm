using AtlasCRM.Application.Contracts.WhatsApp;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IWhatsAppInboxService
{
    Task<IReadOnlyList<WhatsAppConversationDto>> ListConversationsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<WhatsAppMessageDto>> GetMessagesAsync(long conversationId, CancellationToken cancellationToken = default);
    Task<WhatsAppMessageDto> SendMessageAsync(long conversationId, SendWhatsAppMessageRequest request, CancellationToken cancellationToken = default);
    /// <summary>Persiste uma mensagem recebida via webhook (find-or-create da conversa).</summary>
    Task RecordInboundAsync(long companyId, WhatsAppWebhookRequest request, CancellationToken cancellationToken = default);
}
