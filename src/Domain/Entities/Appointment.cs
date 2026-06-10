using AtlasCRM.Domain.Common;
using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Domain.Entities;

public sealed class Appointment : TenantEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartAtUtc { get; set; }
    public DateTime EndAtUtc { get; set; }
    public AppointmentType Type { get; set; } = AppointmentType.Meeting;
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;
    public long? LeadId { get; set; }
    public long? DealId { get; set; }
    public long AssignedUserId { get; set; }

    public Lead? Lead { get; set; }
    public Deal? Deal { get; set; }
    public User? AssignedUser { get; set; }
}
