using AtlasCRM.Domain.Common;
using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Domain.Entities;

public sealed class EventLog : TenantEntity
{
    public EventLogType Type { get; set; }
    public string DataJson { get; set; } = "{}";
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;

    public Company? Company { get; set; }
}
