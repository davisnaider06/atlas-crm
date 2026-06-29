using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Leads;

public sealed class CreateLeadRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string Source { get; set; } = string.Empty;
    public LeadStatus Status { get; set; } = LeadStatus.MessageSent;
    public LeadType LeadType { get; set; } = LeadType.Inbound;
    public LeadTemperature QualificationTemperature { get; set; } = LeadTemperature.Cold;
    public int QualificationScore { get; set; }
    public string? QualificationNotes { get; set; }
    public string? ExtraDataJson { get; set; }
    public long? OwnerUserId { get; set; }

    // Campos do processo comercial capturados na criação. Novos leads
    // sempre entram na etapa 1 (Mapeado) — a etapa não é definida aqui.
    public string? Channel { get; set; }
    public string? CompanyName { get; set; }
    public string? ContactHandle { get; set; }
    public DateTime? NextFollowUpAtUtc { get; set; }
    public string? Observations { get; set; }

    // Ficha completa do lead
    public string? City { get; set; }
    public string? InstagramHandle { get; set; }
    public decimal? GoogleRating { get; set; }

    // Qualificação BANT
    public BantLevel BantBudget { get; set; } = BantLevel.Unknown;
    public BantLevel BantAuthority { get; set; } = BantLevel.Unknown;
    public BantLevel BantNeed { get; set; } = BantLevel.Unknown;
    public BantLevel BantTimeline { get; set; } = BantLevel.Unknown;
}
