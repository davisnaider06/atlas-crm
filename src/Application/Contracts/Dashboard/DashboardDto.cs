namespace AtlasCRM.Application.Contracts.Dashboard;

public sealed class DashboardDto
{
    public int TotalLeads { get; init; }
    public int OpenDeals { get; init; }
    public decimal PipelineValue { get; init; }
    public int PendingActivities { get; init; }
    public IReadOnlyList<StageSummaryDto> StageSummary { get; init; } = [];
}
