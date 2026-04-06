using AtlasCRM.Domain.Common;

namespace AtlasCRM.Domain.Entities;

public sealed class PlanLimit : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int MaxUsers { get; set; }
    public int MaxLeads { get; set; }
    public int MaxAutomations { get; set; }
}
