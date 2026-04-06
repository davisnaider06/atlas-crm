using AtlasCRM.Domain.Common;
using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Domain.Entities;

public sealed class Automation : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public AutomationEventType EventType { get; set; }
    public string ConditionJson { get; set; } = "{}";
    public string ActionJson { get; set; } = "{}";
    public bool IsActive { get; set; } = true;

    public Company? Company { get; set; }
}
