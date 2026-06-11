using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.WhatsApp;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class WhatsAppInboxService : IWhatsAppInboxService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IEventLogService _eventLogService;
    private readonly IHttpClientFactory _httpClientFactory;

    public WhatsAppInboxService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUser,
        IEventLogService eventLogService,
        IHttpClientFactory httpClientFactory)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _eventLogService = eventLogService;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<IReadOnlyList<WhatsAppConversationDto>> ListConversationsAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.WhatsAppConversations
            .AsNoTracking()
            .OrderByDescending(x => x.LastMessageAtUtc)
            .Take(200)
            .Select(x => new WhatsAppConversationDto
            {
                Id = x.Id,
                ContactPhone = x.ContactPhone,
                ContactName = x.ContactName,
                LeadId = x.LeadId,
                LeadName = x.Lead != null ? x.Lead.Name : null,
                LastMessagePreview = x.LastMessagePreview,
                LastMessageAtUtc = x.LastMessageAtUtc,
                UnreadCount = x.UnreadCount
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<WhatsAppMessageDto>> GetMessagesAsync(long conversationId, CancellationToken cancellationToken = default)
    {
        var conversation = await _dbContext.WhatsAppConversations
            .FirstOrDefaultAsync(x => x.Id == conversationId, cancellationToken)
            ?? throw new AppException("Conversa não encontrada.", 404);

        var messages = await _dbContext.WhatsAppMessages
            .AsNoTracking()
            .Where(x => x.ConversationId == conversationId)
            .OrderBy(x => x.SentAtUtc)
            .ThenBy(x => x.Id)
            .Take(500)
            .Select(x => new WhatsAppMessageDto
            {
                Id = x.Id,
                IsInbound = x.IsInbound,
                Text = x.Text,
                SentAtUtc = x.SentAtUtc,
                SenderName = x.SenderName
            })
            .ToListAsync(cancellationToken);

        if (conversation.UnreadCount != 0)
        {
            conversation.UnreadCount = 0;
            conversation.UpdatedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return messages;
    }

    public async Task<WhatsAppMessageDto> SendMessageAsync(long conversationId, SendWhatsAppMessageRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuário não autenticado.", 401);
        var text = request.Text.Trim();
        if (string.IsNullOrWhiteSpace(text))
        {
            throw new AppException("Digite a mensagem.", 400);
        }

        var conversation = await _dbContext.WhatsAppConversations
            .FirstOrDefaultAsync(x => x.Id == conversationId, cancellationToken)
            ?? throw new AppException("Conversa não encontrada.", 404);

        var integration = await _dbContext.WhatsAppIntegrations
            .FirstOrDefaultAsync(x => x.CompanyId == user.CompanyId, cancellationToken)
            ?? throw new AppException("Configure a integração do WhatsApp antes de responder.", 404);

        if (integration.Provider != WhatsAppProvider.Evolution ||
            string.IsNullOrWhiteSpace(integration.ApiBaseUrl) ||
            string.IsNullOrWhiteSpace(integration.ApiToken) ||
            string.IsNullOrWhiteSpace(integration.InstanceName))
        {
            throw new AppException("Integração WhatsApp (Evolution) incompleta. Verifique URL, token e instância.", 409);
        }

        var client = _httpClientFactory.CreateClient("whatsapp");
        client.BaseAddress = new Uri(integration.ApiBaseUrl!.EndsWith('/') ? integration.ApiBaseUrl : $"{integration.ApiBaseUrl}/");
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        client.DefaultRequestHeaders.Remove("apikey");
        client.DefaultRequestHeaders.Add("apikey", integration.ApiToken);

        var body = new { number = conversation.ContactPhone, text };
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"message/sendText/{integration.InstanceName}")
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };

        using var response = await client.SendAsync(httpRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var payload = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new AppException($"Falha ao enviar mensagem pelo WhatsApp: {payload}", 502);
        }

        var message = new WhatsAppMessage
        {
            CompanyId = conversation.CompanyId,
            ConversationId = conversation.Id,
            IsInbound = false,
            Text = text,
            SentAtUtc = DateTime.UtcNow,
            SenderName = user.Email
        };

        conversation.LastMessagePreview = Truncate(text, 140);
        conversation.LastMessageAtUtc = message.SentAtUtc;
        conversation.UpdatedAtUtc = DateTime.UtcNow;

        _dbContext.WhatsAppMessages.Add(message);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new WhatsAppMessageDto
        {
            Id = message.Id,
            IsInbound = false,
            Text = message.Text,
            SentAtUtc = message.SentAtUtc,
            SenderName = message.SenderName
        };
    }

    public async Task RecordInboundAsync(long companyId, WhatsAppWebhookRequest request, CancellationToken cancellationToken = default)
    {
        var text = request.MessageText?.Trim();
        var phone = NormalizePhone(request.PhoneNumber ?? string.Empty);
        if (string.IsNullOrWhiteSpace(text) || string.IsNullOrWhiteSpace(phone))
        {
            return;
        }

        var integrationExists = await _dbContext.WhatsAppIntegrations
            .AnyAsync(x => x.CompanyId == companyId, cancellationToken);
        if (!integrationExists)
        {
            return;
        }

        var conversation = await _dbContext.WhatsAppConversations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.CompanyId == companyId && x.ContactPhone == phone, cancellationToken);

        if (conversation is null)
        {
            var lead = await _dbContext.Leads
                .IgnoreQueryFilters()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.CompanyId == companyId && x.Phone == phone, cancellationToken);

            conversation = new WhatsAppConversation
            {
                CompanyId = companyId,
                ContactPhone = phone,
                ContactName = string.IsNullOrWhiteSpace(request.PushName) ? phone : request.PushName!.Trim(),
                LeadId = lead?.Id
            };
            _dbContext.WhatsAppConversations.Add(conversation);
        }
        else if (!string.IsNullOrWhiteSpace(request.PushName))
        {
            conversation.ContactName = request.PushName!.Trim();
        }

        var sentAt = DateTime.UtcNow;
        conversation.LastMessagePreview = Truncate(text, 140);
        conversation.LastMessageAtUtc = sentAt;
        conversation.UnreadCount += 1;
        conversation.UpdatedAtUtc = sentAt;

        conversation.Messages.Add(new WhatsAppMessage
        {
            CompanyId = companyId,
            IsInbound = true,
            Text = text,
            SentAtUtc = sentAt,
            SenderName = conversation.ContactName
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.WhatsAppLeadCaptured,
            new { conversation.Id, conversation.ContactPhone, Inbound = true },
            companyId,
            cancellationToken);
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];

    private static string NormalizePhone(string value)
    {
        var digits = new string(value.Where(char.IsDigit).ToArray());
        if (string.IsNullOrWhiteSpace(digits))
        {
            return string.Empty;
        }

        if (!digits.StartsWith("55", StringComparison.Ordinal))
        {
            digits = $"55{digits}";
        }

        return digits;
    }
}
