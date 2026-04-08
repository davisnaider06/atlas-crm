using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.History;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class HistoryService : IHistoryService
{
    private readonly IApplicationDbContext _dbContext;

    public HistoryService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<HistoryItemDto>> GetAsync(long? leadId, long? dealId, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.EventLogs.AsNoTracking().OrderByDescending(x => x.OccurredAtUtc).AsQueryable();

        if (leadId.HasValue)
        {
            query = query.Where(x => EF.Functions.Like(x.DataJson, $"%\"Id\":{leadId.Value}%") ||
                                     EF.Functions.Like(x.DataJson, $"%\"leadId\":{leadId.Value}%"));
        }

        if (dealId.HasValue)
        {
            query = query.Where(x => EF.Functions.Like(x.DataJson, $"%\"DealId\":{dealId.Value}%") ||
                                     EF.Functions.Like(x.DataJson, $"%\"dealId\":{dealId.Value}%"));
        }

        return await query
            .Take(50)
            .Select(x => new HistoryItemDto
            {
                Id = x.Id,
                Type = x.Type.ToString(),
                DataJson = x.DataJson,
                OccurredAtUtc = x.OccurredAtUtc
            })
            .ToListAsync(cancellationToken);
    }
}
