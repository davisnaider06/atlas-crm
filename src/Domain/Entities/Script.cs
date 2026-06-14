using AtlasCRM.Domain.Common;

namespace AtlasCRM.Domain.Entities;

/// <summary>
/// Script/abordagem de prospecção reutilizável. Cada contato registrado pode apontar
/// para um script da biblioteca, permitindo medir o que gera resposta.
/// </summary>
public sealed class Script : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    /// <summary>Canal sugerido para o script (Instagram | WhatsApp | Ligação...). Texto livre.</summary>
    public string? Channel { get; set; }
    /// <summary>Conteúdo/modelo do script.</summary>
    public string? Body { get; set; }
    public bool IsActive { get; set; } = true;
}
