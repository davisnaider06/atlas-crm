namespace AtlasCRM.Domain.Common;

public abstract class TenantEntity : BaseEntity
{
    public long CompanyId { get; set; }
}
