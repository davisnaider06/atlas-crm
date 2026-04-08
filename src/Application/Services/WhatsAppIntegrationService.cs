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

    public WhatsAppIntegrationService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUser,
        IEventLogService eventLogService)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _eventLogService = eventLogService;
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
