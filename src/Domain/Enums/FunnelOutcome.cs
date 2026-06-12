namespace AtlasCRM.Domain.Enums;

/// <summary>
/// Desfecho de um lead que chegou na 7ª etapa (Closed).
/// </summary>
public enum FunnelOutcome
{
    None = 0, // ainda no funil, sem desfecho
    Won = 1,  // Fechado (convertido em receita)
    Lost = 2  // Perdido
}
