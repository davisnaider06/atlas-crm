using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Activities;

public sealed class ActivityDto
{
    public long Id { get; init; }
    public long? DealId { get; init; }
    public ActivityType Type { get; init; }
    public string Description { get; init; } = string.Empty;
    public DateTime DueAtUtc { get; init; }
    public ActivityStatus Status { get; init; }
    public long? AssignedUserId { get; init; }
    public DateTime CreatedAtUtc { get; init; }
}
