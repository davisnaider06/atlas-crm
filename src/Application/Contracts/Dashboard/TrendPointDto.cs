namespace AtlasCRM.Application.Contracts.Dashboard;

/// <summary>Um ponto da série temporal do dashboard (bucket por hora/dia/mês).</summary>
public sealed class TrendPointDto
{
    public string Label { get; init; } = string.Empty;
    public int Leads { get; init; }
    public int Deals { get; init; }
}
