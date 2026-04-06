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
        var totalLeads = await _dbContext.Leads.CountAsync(cancellationToken);
        var openDeals = await _dbContext.Deals.CountAsync(x => x.Status == DealStatus.Open, cancellationToken);
        var pipelineValue = await _dbContext.Deals.Where(x => x.Status == DealStatus.Open).SumAsync(x => x.Value, cancellationToken);
        var pendingActivities = await _dbContext.Activities.CountAsync(x => x.Status == ActivityStatus.Pending, cancellationToken);
        var stageSummary = await _dbContext.Deals
            .AsNoTracking()
            .Include(x => x.Stage)
            .GroupBy(x => x.Stage!.Name)
            .Select(x => new StageSummaryDto
            {
                StageName = x.Key,
                DealCount = x.Count(),
                TotalValue = x.Sum(y => y.Value)
            })
            .OrderByDescending(x => x.TotalValue)
            .ToListAsync(cancellationToken);

        return new DashboardDto
        {
            TotalLeads = totalLeads,
            OpenDeals = openDeals,
            PipelineValue = pipelineValue,
            PendingActivities = pendingActivities,
            StageSummary = stageSummary
        };
    }
}
