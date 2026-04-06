using AtlasCRM.Domain.Common;

namespace AtlasCRM.Domain.Entities;

public sealed class Customer : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public long? LeadId { get; set; }

    public Company? Company { get; set; }
    public Lead? Lead { get; set; }
}
