using AtlasCRM.Domain.Common;
using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Domain.Entities;

public sealed class Lead : TenantEntity
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

    // --- Processo comercial Atlas (funil de 7 etapas) ---
    /// <summary>Etapa atual no funil fixo de 7 etapas.</summary>
    public FunnelStage FunnelStage { get; set; } = FunnelStage.Mapped;
    /// <summary>Desfecho quando o lead chega na etapa Closed (Ganho/Perdido).</summary>
    public FunnelOutcome Outcome { get; set; } = FunnelOutcome.None;
    /// <summary>Canal de entrada: Instagram | WhatsApp | indicação.</summary>
    public string? Channel { get; set; }
    /// <summary>Empresa/nicho do prospect (texto livre).</summary>
    public string? CompanyName { get; set; }
    /// <summary>@ do Instagram ou telefone, conforme o canal.</summary>
    public string? ContactHandle { get; set; }

    // --- Ficha completa do lead (identidade para o SDR não pesquisar do zero) ---
    /// <summary>Cidade/praça do prospect.</summary>
    public string? City { get; set; }
    /// <summary>@ do Instagram (campo próprio, separado de telefone/ContactHandle).</summary>
    public string? InstagramHandle { get; set; }
    /// <summary>Nota da avaliação no Google (0–5), quando houver ficha no Google Meu Negócio.</summary>
    public decimal? GoogleRating { get; set; }

    // --- Qualificação BANT estruturada (preenchida durante a prospecção) ---
    /// <summary>Budget — tem orçamento/verba para contratar.</summary>
    public BantLevel BantBudget { get; set; } = BantLevel.Unknown;
    /// <summary>Authority — é o decisor (ou fala direto com ele).</summary>
    public BantLevel BantAuthority { get; set; } = BantLevel.Unknown;
    /// <summary>Need — tem a necessidade/dor que resolvemos.</summary>
    public BantLevel BantNeed { get; set; } = BantLevel.Unknown;
    /// <summary>Timeline — tem prazo/urgência para decidir.</summary>
    public BantLevel BantTimeline { get; set; } = BantLevel.Unknown;

    public DateTime? LastContactAtUtc { get; set; }
    public DateTime? NextFollowUpAtUtc { get; set; }
    /// <summary>Observações livres.</summary>
    public string? Observations { get; set; }
    /// <summary>Valor da proposta — editável a partir da etapa Proposta enviada.</summary>
    public decimal? ProposalValue { get; set; }
    /// <summary>Valor do contrato — obrigatório ao marcar como Fechado.</summary>
    public decimal? ContractValue { get; set; }
    /// <summary>Motivo da perda — obrigatório ao marcar como Perdido.</summary>
    public LossReason LossReason { get; set; } = LossReason.None;
    /// <summary>Status "Frio": lead sem resposta após D+10 (não é exclusão, não muda a etapa).</summary>
    public bool IsCold { get; set; }
    /// <summary>Passo da sequência de follow-up automático (0 = nenhum ainda).</summary>
    public int FollowUpStep { get; set; }

    public Company? Company { get; set; }
    public User? OwnerUser { get; set; }
    public ICollection<Deal> Deals { get; set; } = new List<Deal>();
}
