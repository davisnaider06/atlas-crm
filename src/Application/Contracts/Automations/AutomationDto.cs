using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Automations;

public sealed class AutomationDto
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public AutomationEventType EventType { get; init; }
    public string ConditionJson { get; init; } = "{}";
    public string ActionJson { get; init; } = "{}";
    public bool IsActive { get; init; }
    public DateTime CreatedAtUtc { get; init; }
}
