namespace AtlasCRM.Application.Contracts.Dashboard;

/// <summary>
/// Uma etapa do funil com a contagem de leads que a alcançaram e a conversão para a próxima.
/// Permite enxergar onde os leads abandonam o processo.
/// </summary>
public sealed class FunnelConversionStageDto
{
    public string StageName { get; init; } = string.Empty;
    public int Order { get; init; }
    /// <summary>Quantos leads já passaram (ao menos chegaram) por esta etapa.</summary>
    public int ReachedCount { get; init; }
    /// <summary>Leads que chegaram aqui mas não avançaram para a próxima etapa.</summary>
    public int DroppedCount { get; init; }
    /// <summary>Taxa de conversão desta etapa para a próxima (0–1).</summary>
    public double ConversionRate { get; init; }
}
