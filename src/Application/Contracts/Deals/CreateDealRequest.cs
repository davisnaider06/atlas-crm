namespace AtlasCRM.Application.Contracts.Deals;

public sealed class CreateDealRequest
{
    public long LeadId { get; set; }
    public long StageId { get; set; }
    public decimal Value { get; set; }
    public long? OwnerUserId { get; set; }
}
