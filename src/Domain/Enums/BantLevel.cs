namespace AtlasCRM.Domain.Enums;

/// <summary>
/// Nível de qualificação BANT por dimensão (Budget, Authority, Need, Timeline).
/// Estruturado (nunca texto livre) para alimentar relatórios e a base de IA.
/// </summary>
public enum BantLevel
{
    Unknown = 0, // não avaliado ainda
    No = 1,      // não atende a dimensão
    Partial = 2, // atende parcialmente
    Yes = 3      // atende plenamente
}
