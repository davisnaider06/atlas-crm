using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Leads;

/// <summary>
/// Move um lead entre etapas do funil. Ao chegar na 7ª etapa (Closed), o desfecho
/// é obrigatório: Won exige <see cref="ContractValue"/>; Lost exige <see cref="LossReason"/>.
/// </summary>
public sealed class MoveLeadStageRequest
{
    public FunnelStage FunnelStage { get; set; } = FunnelStage.Mapped;
    public FunnelOutcome Outcome { get; set; } = FunnelOutcome.None;
    /// <summary>Obrigatório (> 0) ao marcar como Fechado (Won).</summary>
    public decimal? ContractValue { get; set; }
    /// <summary>Obrigatório (≠ None) ao marcar como Perdido (Lost).</summary>
    public LossReason LossReason { get; set; } = LossReason.None;
}
