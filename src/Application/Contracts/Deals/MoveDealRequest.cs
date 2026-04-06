using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Deals;

public sealed class MoveDealRequest
{
    public long StageId { get; set; }
    public DealStatus Status { get; set; } = DealStatus.Open;
}
