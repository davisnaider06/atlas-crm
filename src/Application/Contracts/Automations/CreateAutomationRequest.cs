using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Automations;

public sealed class CreateAutomationRequest
{
    public string Name { get; set; } = string.Empty;
    public AutomationEventType EventType { get; set; }
    public string ConditionJson { get; set; } = "{}";
    public string ActionJson { get; set; } = "{}";
    public bool IsActive { get; set; } = true;
}
