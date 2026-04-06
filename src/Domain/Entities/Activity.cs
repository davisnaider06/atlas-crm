using AtlasCRM.Domain.Common;
using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Domain.Entities;

public sealed class Activity : TenantEntity
{
    public long? DealId { get; set; }
    public ActivityType Type { get; set; } = ActivityType.Task;
    public string Description { get; set; } = string.Empty;
    public DateTime DueAtUtc { get; set; }
    public ActivityStatus Status { get; set; } = ActivityStatus.Pending;
    public long? AssignedUserId { get; set; }

    public Company? Company { get; set; }
    public Deal? Deal { get; set; }
}
