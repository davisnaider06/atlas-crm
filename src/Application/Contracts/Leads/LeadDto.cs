using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Leads;

public sealed class LeadDto
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string Source { get; init; } = string.Empty;
    public LeadStatus Status { get; init; }
    public LeadTemperature QualificationTemperature { get; init; }
    public int QualificationScore { get; init; }
    public string? QualificationNotes { get; init; }
    public long? OwnerUserId { get; init; }
    public string? OwnerName { get; init; }
    public string? ExtraDataJson { get; init; }
    public DateTime CreatedAtUtc { get; init; }

    // Processo comercial Atlas (funil de 7 etapas)
    public FunnelStage FunnelStage { get; init; }
    public FunnelOutcome Outcome { get; init; }
    public string? Channel { get; init; }
    public string? CompanyName { get; init; }
    public string? ContactHandle { get; init; }
    public DateTime? LastContactAtUtc { get; init; }
    public DateTime? NextFollowUpAtUtc { get; init; }
    public string? Observations { get; init; }
    public decimal? ProposalValue { get; init; }
    public decimal? ContractValue { get; init; }
    public LossReason LossReason { get; init; }
    public bool IsCold { get; init; }
    public int FollowUpStep { get; init; }

    // Ficha completa do lead
    public string? City { get; init; }
    public string? InstagramHandle { get; init; }
    public decimal? GoogleRating { get; init; }

    // Qualificação BANT
    public BantLevel BantBudget { get; init; }
    public BantLevel BantAuthority { get; init; }
    public BantLevel BantNeed { get; init; }
    public BantLevel BantTimeline { get; init; }
}
