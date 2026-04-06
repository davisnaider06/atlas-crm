using AtlasCRM.Domain.Common;
using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Domain.Entities;

public sealed class Deal : TenantEntity
{
    public long LeadId { get; set; }
    public long StageId { get; set; }
    public decimal Value { get; set; }
    public DealStatus Status { get; set; } = DealStatus.Open;
    public long? OwnerUserId { get; set; }

    public Company? Company { get; set; }
    public Lead? Lead { get; set; }
    public Stage? Stage { get; set; }
    public User? OwnerUser { get; set; }
    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
}
