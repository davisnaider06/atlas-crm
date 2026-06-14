using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Leads;

public sealed class CreateLeadInteractionRequest
{
    public string Channel { get; set; } = string.Empty;
    public long? ScriptId { get; set; }
    public InteractionOutcome Outcome { get; set; } = InteractionOutcome.NoReply;
    public string? Notes { get; set; }
    /// <summary>Quando o contato aconteceu. Se nulo, usa o momento do registro.</summary>
    public DateTime? OccurredAtUtc { get; set; }
}
