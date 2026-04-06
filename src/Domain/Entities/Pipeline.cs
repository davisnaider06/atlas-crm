using AtlasCRM.Domain.Common;

namespace AtlasCRM.Domain.Entities;

public sealed class Pipeline : TenantEntity
{
    public string Name { get; set; } = string.Empty;

    public Company? Company { get; set; }
    public ICollection<Stage> Stages { get; set; } = new List<Stage>();
}
