using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Leads;

public sealed class CreateLeadRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string Source { get; set; } = string.Empty;
    public LeadStatus Status { get; set; } = LeadStatus.MessageSent;
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
}
