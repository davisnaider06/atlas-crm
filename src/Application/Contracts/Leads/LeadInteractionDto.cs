using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Leads;

public sealed class LeadInteractionDto
{
    public long Id { get; init; }
    public long LeadId { get; init; }
    public string Channel { get; init; } = string.Empty;
    public long? ScriptId { get; init; }
    public string? ScriptName { get; init; }
    public InteractionOutcome Outcome { get; init; }
    public string? Notes { get; init; }
    public DateTime OccurredAtUtc { get; init; }
    public long? CreatedByUserId { get; init; }
    public string? CreatedByName { get; init; }
}
