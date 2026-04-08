using AtlasCRM.Application.Contracts.WhatsApp;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IWhatsAppIntegrationService
{
    Task<WhatsAppIntegrationDto> GetAsync(CancellationToken cancellationToken = default);
    Task<WhatsAppIntegrationDto> SaveAsync(UpdateWhatsAppIntegrationRequest request, CancellationToken cancellationToken = default);
}
