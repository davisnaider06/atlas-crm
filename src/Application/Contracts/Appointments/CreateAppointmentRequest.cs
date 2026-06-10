using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Appointments;

public sealed class CreateAppointmentRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTime StartAtUtc { get; init; }
    public DateTime EndAtUtc { get; init; }
    public AppointmentType Type { get; init; } = AppointmentType.Meeting;
    public long? LeadId { get; init; }
    public long? DealId { get; init; }
    public long? AssignedUserId { get; init; }
}
