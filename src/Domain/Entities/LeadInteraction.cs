using AtlasCRM.Domain.Common;
using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Domain.Entities;

/// <summary>
/// Registro de um contato feito com o lead (mensagem, ligação...). Guarda qual script
/// foi usado e o resultado, alimentando a timeline unificada e os relatórios de IA.
/// </summary>
public sealed class LeadInteraction : TenantEntity
{
    public long LeadId { get; set; }
    /// <summary>Canal do contato: Instagram | WhatsApp | Ligação | Email...</summary>
    public string Channel { get; set; } = string.Empty;
    /// <summary>Script da biblioteca usado, quando aplicável.</summary>
    public long? ScriptId { get; set; }
    /// <summary>Snapshot do nome do script (resiliente a exclusão do script).</summary>
    public string? ScriptName { get; set; }
    public InteractionOutcome Outcome { get; set; } = InteractionOutcome.NoReply;
    public string? Notes { get; set; }
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
    public long? CreatedByUserId { get; set; }

    public Lead? Lead { get; set; }
    public Script? Script { get; set; }
    public User? CreatedByUser { get; set; }
}
