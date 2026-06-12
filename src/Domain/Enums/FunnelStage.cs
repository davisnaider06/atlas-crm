namespace AtlasCRM.Domain.Enums;

/// <summary>
/// Etapas fixas do funil comercial da Atlas. São exatamente 7 — não pode existir etapa extra.
/// A 7ª etapa (Closed) representa tanto "Fechado" quanto "Perdido"; o desfecho fica em <see cref="FunnelOutcome"/>.
/// </summary>
public enum FunnelStage
{
    Mapped = 1,           // Mapeado
    Prospected = 2,       // Prospectado
    Replied = 3,          // Respondeu
    MeetingScheduled = 4, // Reunião agendada
    MeetingDone = 5,      // Reunião feita
    ProposalSent = 6,     // Proposta enviada
    Closed = 7            // Fechado / Perdido
}
