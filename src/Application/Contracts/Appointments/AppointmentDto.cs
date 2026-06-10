using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Appointments;

public sealed class AppointmentDto
{
    public long Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTime StartAtUtc { get; init; }
    public DateTime EndAtUtc { get; init; }
    public AppointmentType Type { get; init; }
    public AppointmentStatus Status { get; init; }
    public long? LeadId { get; init; }
    public string? LeadName { get; init; }
    public long? DealId { get; init; }
    public string? DealLeadName { get; init; }
    public long AssignedUserId { get; init; }
    public string? AssignedUserName { get; init; }
    public DateTime CreatedAtUtc { get; init; }
}
