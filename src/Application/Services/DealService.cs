using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Deals;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class DealService : IDealService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IEventLogService _eventLogService;

    public DealService(IApplicationDbContext dbContext, ICurrentUserService currentUser, IEventLogService eventLogService)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _eventLogService = eventLogService;
    }

    public async Task<PagedResult<DealDto>> GetPagedAsync(int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Deals
            .AsNoTracking()
            .Include(x => x.Stage)
            .Include(x => x.Lead)
            .OrderByDescending(x => x.CreatedAtUtc)
            .AsQueryable();

        if (_currentUser.User?.Role == UserRole.Sales)
        {
            query = query.Where(x => x.OwnerUserId == _currentUser.User.UserId);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new DealDto
            {
                Id = x.Id,
                LeadId = x.LeadId,
                StageId = x.StageId,
                Value = x.Value,
                Status = x.Status,
                OwnerUserId = x.OwnerUserId,
                StageName = x.Stage!.Name,
                LeadName = x.Lead!.Name,
                CreatedAtUtc = x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<DealDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    public async Task<DealDto> CreateAsync(CreateDealRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuario nao autenticado.", 401);

        var leadExists = await _dbContext.Leads.AnyAsync(x => x.Id == request.LeadId, cancellationToken);
        var stage = await _dbContext.Stages.FirstOrDefaultAsync(x => x.Id == request.StageId, cancellationToken)
            ?? throw new AppException("Etapa nao encontrada.", 404);

        if (!leadExists)
        {
            throw new AppException("Lead nao encontrado.", 404);
        }

        var deal = new Deal
        {
            CompanyId = user.CompanyId,
            LeadId = request.LeadId,
            StageId = request.StageId,
            Value = request.Value,
            OwnerUserId = request.OwnerUserId ?? user.UserId,
            Status = DealStatus.Open
        };

        _dbContext.Deals.Add(deal);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.DealCreated,
            new { deal.Id, deal.StageId, deal.Value },
            cancellationToken: cancellationToken);

        var lead = await _dbContext.Leads.AsNoTracking().FirstAsync(x => x.Id == request.LeadId, cancellationToken);

        return new DealDto
        {
            Id = deal.Id,
            LeadId = deal.LeadId,
            StageId = deal.StageId,
            Value = deal.Value,
            Status = deal.Status,
            OwnerUserId = deal.OwnerUserId,
            StageName = stage.Name,
            LeadName = lead.Name,
            CreatedAtUtc = deal.CreatedAtUtc
        };
    }

    public async Task<DealDto> MoveAsync(long id, MoveDealRequest request, CancellationToken cancellationToken = default)
    {
        var deal = await _dbContext.Deals.Include(x => x.Lead).FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Negocio nao encontrado.", 404);

        var stage = await _dbContext.Stages.FirstOrDefaultAsync(x => x.Id == request.StageId, cancellationToken)
            ?? throw new AppException("Etapa nao encontrada.", 404);

        deal.StageId = request.StageId;
        deal.Status = request.Status;
        deal.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.DealMoved,
            new { deal.Id, deal.StageId, deal.Status },
            cancellationToken: cancellationToken);

        var matchingAutomations = await _dbContext.Automations
            .AsNoTracking()
            .Where(x => x.EventType == AutomationEventType.DealMoved && x.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var automation in matchingAutomations)
        {
            await _eventLogService.LogAsync(
                EventLogType.AutomationExecuted,
                new
                {
                    AutomationId = automation.Id,
                    automation.Name,
                    Trigger = "DealMoved",
                    DealId = deal.Id,
                    deal.StageId,
                    deal.Status
                },
                cancellationToken: cancellationToken);
        }

        return new DealDto
        {
            Id = deal.Id,
            LeadId = deal.LeadId,
            StageId = deal.StageId,
            Value = deal.Value,
            Status = deal.Status,
            OwnerUserId = deal.OwnerUserId,
            StageName = stage.Name,
            LeadName = deal.Lead!.Name,
            CreatedAtUtc = deal.CreatedAtUtc
        };
    }
}
