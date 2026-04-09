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

public sealed class WhatsAppIntegrationService : IWhatsAppIntegrationService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IEventLogService _eventLogService;
    private readonly IHttpClientFactory _httpClientFactory;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public WhatsAppIntegrationService(
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

    public async Task<WhatsAppIntegrationDto> GetAsync(CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuario nao autenticado.", 401);
        var integration = await _dbContext.WhatsAppIntegrations.AsNoTracking()
            .FirstOrDefaultAsync(x => x.CompanyId == user.CompanyId, cancellationToken);

        return Map(integration);
    }

    public async Task<WhatsAppIntegrationDto> SaveAsync(UpdateWhatsAppIntegrationRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuario nao autenticado.", 401);
        var integration = await _dbContext.WhatsAppIntegrations
            .FirstOrDefaultAsync(x => x.CompanyId == user.CompanyId, cancellationToken);

        if (integration is null)
        {
            integration = new WhatsAppIntegration { CompanyId = user.CompanyId };
            _dbContext.WhatsAppIntegrations.Add(integration);
        }

        integration.Provider = request.Provider;
        integration.InstanceName = request.InstanceName.Trim();
        integration.PhoneNumber = request.PhoneNumber.Trim();
        integration.WebhookUrl = request.WebhookUrl?.Trim();
        integration.ApiBaseUrl = request.ApiBaseUrl?.Trim();
        integration.ApiToken = request.ApiToken?.Trim();
        integration.CaptureLeadsEnabled = request.CaptureLeadsEnabled;
        integration.BroadcastEnabled = request.BroadcastEnabled;
        integration.Status = request.Status;
        integration.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.WhatsAppIntegrationUpdated,
            new { integration.Provider, integration.InstanceName, integration.Status },
            cancellationToken: cancellationToken);

        return Map(integration);
    }

    public async Task<WhatsAppConnectionSessionDto> StartQrConnectionAsync(CancellationToken cancellationToken = default)
    {
        var integration = await GetRequiredIntegrationAsync(cancellationToken);
        var client = CreateClient(integration);

        await EnsureEvolutionInstanceAsync(client, integration, cancellationToken);

        using var request = new HttpRequestMessage(HttpMethod.Get, $"instance/connect/{integration.InstanceName}");
        using var response = await client.SendAsync(request, cancellationToken);
        var payload = await ReadJsonAsync(response, cancellationToken);

        integration.Status = WhatsAppConnectionStatus.Pending;
        integration.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.WhatsAppQrRequested,
            new { integration.InstanceName },
            cancellationToken: cancellationToken);

        return ParseConnectionSession(payload, integration.InstanceName, integration.PhoneNumber, "Pending");
    }

    public async Task<WhatsAppConnectionSessionDto> GetConnectionSessionAsync(CancellationToken cancellationToken = default)
    {
        var integration = await GetRequiredIntegrationAsync(cancellationToken);
        var client = CreateClient(integration);

        using var stateRequest = new HttpRequestMessage(HttpMethod.Get, $"instance/connectionState/{integration.InstanceName}");
        using var stateResponse = await client.SendAsync(stateRequest, cancellationToken);
        var payload = await ReadJsonAsync(stateResponse, cancellationToken);

        var state = FindString(payload.RootElement, "state", "status", "instance.state") ?? integration.Status.ToString();
        integration.Status = MapStatus(state);
        integration.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        var session = ParseConnectionSession(payload, integration.InstanceName, integration.PhoneNumber, integration.Status.ToString());

        if (integration.Status == WhatsAppConnectionStatus.Connected && string.IsNullOrWhiteSpace(session.PhoneNumber))
        {
            session.PhoneNumber = integration.PhoneNumber;
        }

        return session;
    }

    public async Task<WhatsAppCampaignResultDto> SendCampaignAsync(SendWhatsAppCampaignRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            throw new AppException("Informe a mensagem da campanha.", 400);
        }

        if (request.Recipients.Count == 0)
        {
            throw new AppException("Adicione pelo menos um contato para disparo.", 400);
        }

        var integration = await GetRequiredIntegrationAsync(cancellationToken);
        if (!integration.BroadcastEnabled)
        {
            throw new AppException("O disparo em massa esta desativado para esta integracao.", 409);
        }

        var client = CreateClient(integration);
        var results = new List<WhatsAppCampaignDispatchDto>();

        foreach (var recipient in request.Recipients.Where(x => !string.IsNullOrWhiteSpace(x.PhoneNumber)))
        {
            var normalizedPhone = NormalizePhone(recipient.PhoneNumber);
            var personalizedText = request.Message.Replace("{{nome}}", recipient.Name, StringComparison.OrdinalIgnoreCase);
            var body = new
            {
                number = normalizedPhone,
                text = personalizedText
            };

            using var message = new HttpRequestMessage(HttpMethod.Post, $"message/sendText/{integration.InstanceName}")
            {
                Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
            };

            try
            {
                using var response = await client.SendAsync(message, cancellationToken);
                var payload = await ReadJsonAsync(response, cancellationToken);
                results.Add(new WhatsAppCampaignDispatchDto
                {
                    Name = recipient.Name,
                    PhoneNumber = normalizedPhone,
                    Success = response.IsSuccessStatusCode,
                    ExternalId = FindString(payload.RootElement, "key.id", "messageId", "id"),
                    Error = response.IsSuccessStatusCode ? null : payload.RootElement.ToString()
                });
            }
            catch (Exception ex)
            {
                results.Add(new WhatsAppCampaignDispatchDto
                {
                    Name = recipient.Name,
                    PhoneNumber = normalizedPhone,
                    Success = false,
                    Error = ex.Message
                });
            }
        }

        var result = new WhatsAppCampaignResultDto
        {
            TotalRecipients = results.Count,
            SentCount = results.Count(x => x.Success),
            FailedCount = results.Count(x => !x.Success),
            Results = results
        };

        await _eventLogService.LogAsync(
            EventLogType.WhatsAppCampaignSent,
            new { result.TotalRecipients, result.SentCount, result.FailedCount, integration.InstanceName },
            cancellationToken: cancellationToken);

        return result;
    }

    public async Task CaptureLeadAsync(long companyId, WhatsAppWebhookRequest request, CancellationToken cancellationToken = default)
    {
        var integration = await _dbContext.WhatsAppIntegrations.FirstOrDefaultAsync(x => x.CompanyId == companyId, cancellationToken);
        if (integration is null || !integration.CaptureLeadsEnabled)
        {
            return;
        }

        var phoneNumber = NormalizePhone(request.PhoneNumber ?? string.Empty);
        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            return;
        }

        var existingLead = await _dbContext.Leads.FirstOrDefaultAsync(x => x.CompanyId == companyId && x.Phone == phoneNumber, cancellationToken);
        if (existingLead is not null)
        {
            return;
        }

        var company = await _dbContext.Companies.AsNoTracking().FirstAsync(x => x.Id == companyId, cancellationToken);
        var currentLeadCount = await _dbContext.Leads.CountAsync(x => x.CompanyId == companyId, cancellationToken);
        var maxLeads = company.Plan switch
        {
            PlanType.Starter => 500,
            PlanType.Growth => 5000,
            _ => 50000
        };

        if (currentLeadCount >= maxLeads)
        {
            return;
        }

        var lead = new Lead
        {
            CompanyId = companyId,
            Name = string.IsNullOrWhiteSpace(request.PushName) ? phoneNumber : request.PushName.Trim(),
            Phone = phoneNumber,
            Source = "WhatsApp",
            Status = LeadStatus.New
        };

        _dbContext.Leads.Add(lead);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.WhatsAppLeadCaptured,
            new { lead.Id, lead.Phone, request.MessageText },
            companyId,
            cancellationToken);
    }

    private async Task<WhatsAppIntegration> GetRequiredIntegrationAsync(CancellationToken cancellationToken)
    {
        var user = _currentUser.User ?? throw new AppException("Usuario nao autenticado.", 401);
        var integration = await _dbContext.WhatsAppIntegrations.FirstOrDefaultAsync(x => x.CompanyId == user.CompanyId, cancellationToken)
            ?? throw new AppException("Configure a integracao do WhatsApp antes de conectar.", 404);

        if (integration.Provider != WhatsAppProvider.Evolution)
        {
            throw new AppException("A conexao por QR desta fase usa Evolution API como provedor.", 409);
        }

        if (string.IsNullOrWhiteSpace(integration.ApiBaseUrl) || string.IsNullOrWhiteSpace(integration.ApiToken) || string.IsNullOrWhiteSpace(integration.InstanceName))
        {
            throw new AppException("Preencha API Base URL, token e nome da instancia para conectar o WhatsApp.", 400);
        }

        return integration;
    }

    private HttpClient CreateClient(WhatsAppIntegration integration)
    {
        var client = _httpClientFactory.CreateClient("whatsapp");
        client.BaseAddress = new Uri(EnsureTrailingSlash(integration.ApiBaseUrl!));
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        client.DefaultRequestHeaders.Remove("apikey");
        client.DefaultRequestHeaders.Add("apikey", integration.ApiToken);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", integration.ApiToken);
        return client;
    }

    private async Task EnsureEvolutionInstanceAsync(HttpClient client, WhatsAppIntegration integration, CancellationToken cancellationToken)
    {
        var body = new
        {
            instanceName = integration.InstanceName,
            integration = "WHATSAPP-BAILEYS",
            qrcode = true,
            webhook = string.IsNullOrWhiteSpace(integration.WebhookUrl) ? null : new
            {
                url = integration.WebhookUrl,
                byEvents = false,
                base64 = false
            }
        };

        using var message = new HttpRequestMessage(HttpMethod.Post, "instance/create")
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };

        using var response = await client.SendAsync(message, cancellationToken);
        if (response.IsSuccessStatusCode || response.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            return;
        }

        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        if (payload.Contains("already", StringComparison.OrdinalIgnoreCase) ||
            payload.Contains("exists", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }
    }

    private static async Task<JsonDocument> ReadJsonAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        var content = await response.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(content))
        {
            content = "{}";
        }

        if (!response.IsSuccessStatusCode)
        {
            throw new AppException($"Falha ao comunicar com o provedor WhatsApp: {content}", (int)response.StatusCode);
        }

        return JsonDocument.Parse(content);
    }

    private static WhatsAppConnectionSessionDto ParseConnectionSession(JsonDocument payload, string instanceName, string? phoneNumber, string fallbackStatus)
    {
        var qrCode = FindString(payload.RootElement, "base64", "qrcode.base64", "qr.base64", "code");
        if (!string.IsNullOrWhiteSpace(qrCode) && qrCode.StartsWith("data:image", StringComparison.OrdinalIgnoreCase))
        {
            qrCode = qrCode[(qrCode.IndexOf(',') + 1)..];
        }

        return new WhatsAppConnectionSessionDto
        {
            InstanceName = instanceName,
            Status = FindString(payload.RootElement, "state", "status", "instance.state") ?? fallbackStatus,
            QrCodeBase64 = qrCode,
            PairingCode = FindString(payload.RootElement, "pairingCode", "code"),
            PhoneNumber = FindString(payload.RootElement, "number", "ownerJid", "instance.owner") ?? phoneNumber,
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(1)
        };
    }

    private static string? FindString(JsonElement element, params string[] paths)
    {
        foreach (var path in paths)
        {
            var value = FindPath(element, path);
            if (value.HasValue && value.Value.ValueKind is JsonValueKind.String or JsonValueKind.Number)
            {
                return value.Value.ToString();
            }
        }

        return null;
    }

    private static JsonElement? FindPath(JsonElement element, string path)
    {
        var current = element;
        foreach (var segment in path.Split('.', StringSplitOptions.RemoveEmptyEntries))
        {
            if (current.ValueKind != JsonValueKind.Object || !current.TryGetProperty(segment, out var next))
            {
                return null;
            }

            current = next;
        }

        return current;
    }

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

    private static WhatsAppConnectionStatus MapStatus(string rawStatus)
    {
        if (string.Equals(rawStatus, "open", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(rawStatus, "connected", StringComparison.OrdinalIgnoreCase))
        {
            return WhatsAppConnectionStatus.Connected;
        }

        if (string.Equals(rawStatus, "connecting", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(rawStatus, "pairing", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(rawStatus, "pending", StringComparison.OrdinalIgnoreCase))
        {
            return WhatsAppConnectionStatus.Pending;
        }

        return WhatsAppConnectionStatus.Disconnected;
    }

    private static string EnsureTrailingSlash(string url)
    {
        return url.EndsWith("/", StringComparison.Ordinal) ? url : $"{url}/";
    }

    private static WhatsAppIntegrationDto Map(WhatsAppIntegration? integration)
    {
        if (integration is null)
        {
            return new WhatsAppIntegrationDto
            {
                Id = 0,
                Provider = WhatsAppProvider.None.ToString(),
                InstanceName = string.Empty,
                PhoneNumber = string.Empty,
                Status = WhatsAppConnectionStatus.Disconnected.ToString()
            };
        }

        return new WhatsAppIntegrationDto
        {
            Id = integration.Id,
            Provider = integration.Provider.ToString(),
            InstanceName = integration.InstanceName,
            PhoneNumber = integration.PhoneNumber,
            WebhookUrl = integration.WebhookUrl,
            ApiBaseUrl = integration.ApiBaseUrl,
            CaptureLeadsEnabled = integration.CaptureLeadsEnabled,
            BroadcastEnabled = integration.BroadcastEnabled,
            Status = integration.Status.ToString()
        };
    }
}
