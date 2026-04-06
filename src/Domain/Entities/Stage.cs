using AtlasCRM.Domain.Common;

namespace AtlasCRM.Domain.Entities;

public sealed class Stage : BaseEntity
{
    public long PipelineId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }

    public Pipeline? Pipeline { get; set; }
    public ICollection<Deal> Deals { get; set; } = new List<Deal>();
}
