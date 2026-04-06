using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Activities;

public sealed class CreateActivityRequest
{
    public long? DealId { get; set; }
    public ActivityType Type { get; set; } = ActivityType.Task;
    public string Description { get; set; } = string.Empty;
    public DateTime DueAtUtc { get; set; }
    public ActivityStatus Status { get; set; } = ActivityStatus.Pending;
    public long? AssignedUserId { get; set; }
}
