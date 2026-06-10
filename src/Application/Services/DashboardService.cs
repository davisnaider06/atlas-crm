using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.Dashboard;
using AtlasCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class DashboardService : IDashboardService
{
    private readonly IApplicationDbContext _dbContext;

    public DashboardService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DashboardDto> GetAsync(CancellationToken cancellationToken = default)
    {
        var totalLeadsTask = _dbContext.Leads.CountAsync(cancellationToken);
        var openDealsTask = _dbContext.Deals.CountAsync(x => x.Status == DealStatus.Open, cancellationToken);
        var pipelineValueTask = _dbContext.Deals
            .Where(x => x.Status == DealStatus.Open)
            .SumAsync(x => (decimal?)x.Value, cancellationToken);
        var pendingActivitiesTask = _dbContext.Activities
            .CountAsync(x => x.Status == ActivityStatus.Pending, cancellationToken);
        var stageSummaryTask = _dbContext.Deals
            .AsNoTracking()
            .Where(x => x.Stage != null)
            .GroupBy(x => x.Stage!.Name)
            .Select(x => new StageSummaryDto
            {
                StageName = x.Key,
                DealCount = x.Count(),
                TotalValue = x.Sum(y => y.Value)
            })
            .OrderByDescending(x => x.TotalValue)
            .ToListAsync(cancellationToken);

        await Task.WhenAll(totalLeadsTask, openDealsTask, pipelineValueTask, pendingActivitiesTask, stageSummaryTask);

        return new DashboardDto
        {
            TotalLeads = await totalLeadsTask,
            OpenDeals = await openDealsTask,
            PipelineValue = await pipelineValueTask ?? 0m,
            PendingActivities = await pendingActivitiesTask,
            StageSummary = await stageSummaryTask
        };
    }
}
