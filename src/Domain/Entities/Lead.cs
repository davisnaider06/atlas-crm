using AtlasCRM.Domain.Common;
using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Domain.Entities;

public sealed class Lead : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string Source { get; set; } = string.Empty;
    public LeadStatus Status { get; set; } = LeadStatus.New;
    public LeadTemperature QualificationTemperature { get; set; } = LeadTemperature.Cold;
    public int QualificationScore { get; set; }
    public string? QualificationNotes { get; set; }
    public string? ExtraDataJson { get; set; }
    public long? OwnerUserId { get; set; }

    public Company? Company { get; set; }
    public User? OwnerUser { get; set; }
    public ICollection<Deal> Deals { get; set; } = new List<Deal>();
}
