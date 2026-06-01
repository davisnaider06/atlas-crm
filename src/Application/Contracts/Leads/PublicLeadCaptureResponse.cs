using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Leads;

public sealed class PublicLeadCaptureResponse
{
    public long LeadId { get; init; }
    public LeadTemperature QualificationTemperature { get; init; }
    public int QualificationScore { get; init; }
    public long? OwnerUserId { get; init; }
}
