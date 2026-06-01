using AtlasCRM.Application.Contracts.Leads;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IPublicLeadCaptureService
{
    Task<PublicLeadCaptureResponse> CaptureAsync(PublicLeadCaptureRequest request, string? apiKey, CancellationToken cancellationToken = default);
}
