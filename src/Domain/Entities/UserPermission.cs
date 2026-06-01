using AtlasCRM.Domain.Common;

namespace AtlasCRM.Domain.Entities;

public sealed class UserPermission : TenantEntity
{
    public long UserId { get; set; }
    public string Permission { get; set; } = string.Empty;

    public User? User { get; set; }
}
