using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Deals;

public sealed class UpdateDealRequest
{
    public decimal Value { get; set; }
    public DealStatus Status { get; set; } = DealStatus.Open;
    public long? OwnerUserId { get; set; }
}
