using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Leads;

public sealed class UpdateLeadRequest
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

    // Campos descritivos do processo comercial (edição livre).
    // A etapa do funil, o desfecho, o valor de contrato e o motivo de perda
    // NÃO são alterados aqui — usam o endpoint de movimentação (/leads/{id}/move).
    public string? Channel { get; set; }
    public string? CompanyName { get; set; }
    public string? ContactHandle { get; set; }
    public DateTime? LastContactAtUtc { get; set; }
    public DateTime? NextFollowUpAtUtc { get; set; }
    /// <summary>Em qual follow-up o lead está (0 = nenhum, 1 a 7). Editável manualmente.</summary>
    public int FollowUpStep { get; set; }
    public string? Observations { get; set; }
    /// <summary>Valor da proposta — editável a partir da etapa Proposta enviada.</summary>
    public decimal? ProposalValue { get; set; }

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
