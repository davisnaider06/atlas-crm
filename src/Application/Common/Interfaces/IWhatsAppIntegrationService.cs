using AtlasCRM.Application.Contracts.WhatsApp;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IWhatsAppIntegrationService
{
    Task<WhatsAppIntegrationDto> GetAsync(CancellationToken cancellationToken = default);
    Task<WhatsAppIntegrationDto> SaveAsync(UpdateWhatsAppIntegrationRequest request, CancellationToken cancellationToken = default);
    Task<WhatsAppConnectionSessionDto> StartQrConnectionAsync(CancellationToken cancellationToken = default);
    Task<WhatsAppConnectionSessionDto> GetConnectionSessionAsync(CancellationToken cancellationToken = default);
    Task<WhatsAppCampaignResultDto> SendCampaignAsync(SendWhatsAppCampaignRequest request, CancellationToken cancellationToken = default);
    Task CaptureLeadAsync(long companyId, WhatsAppWebhookRequest request, CancellationToken cancellationToken = default);
}
