using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Leads;

public sealed class LeadDto
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string Source { get; init; } = string.Empty;
    public LeadStatus Status { get; init; }
    public LeadTemperature QualificationTemperature { get; init; }
    public int QualificationScore { get; init; }
    public string? QualificationNotes { get; init; }
    public long? OwnerUserId { get; init; }
    public string? OwnerName { get; init; }
    public DateTime CreatedAtUtc { get; init; }
}
