using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Deals;

public sealed class DealDto
{
    public long Id { get; init; }
    public long LeadId { get; init; }
    public long StageId { get; init; }
    public decimal Value { get; init; }
    public DealStatus Status { get; init; }
    public long? OwnerUserId { get; init; }
    public string StageName { get; init; } = string.Empty;
    public string LeadName { get; init; } = string.Empty;
    public DateTime CreatedAtUtc { get; init; }
}
