namespace AtlasCRM.Application.Contracts.Dashboard;

public sealed class StageSummaryDto
{
    public string StageName { get; init; } = string.Empty;
    public int DealCount { get; init; }
    public decimal TotalValue { get; init; }
}
