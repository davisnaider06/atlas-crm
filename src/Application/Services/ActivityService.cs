using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Activities;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class ActivityService : IActivityService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IEventLogService _eventLogService;

    public ActivityService(IApplicationDbContext dbContext, ICurrentUserService currentUser, IEventLogService eventLogService)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _eventLogService = eventLogService;
    }

    public async Task<PagedResult<ActivityDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        string? status = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Activities.AsNoTracking().OrderBy(x => x.DueAtUtc).AsQueryable();

        if (_currentUser.User?.Role == UserRole.Sales)
        {
            query = query.Where(x => x.AssignedUserId == _currentUser.User.UserId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim().ToLowerInvariant();
            query = query.Where(x => x.Description.ToLower().Contains(normalized));
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ActivityStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(x => x.Status == parsedStatus);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new ActivityDto
            {
                Id = x.Id,
                DealId = x.DealId,
                Type = x.Type,
                Description = x.Description,
                DueAtUtc = x.DueAtUtc,
                Status = x.Status,
                AssignedUserId = x.AssignedUserId,
                CreatedAtUtc = x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<ActivityDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    public async Task<ActivityDto> CreateAsync(CreateActivityRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuario nao autenticado.", 401);

        if (request.DealId.HasValue)
        {
            var exists = await _dbContext.Deals.AnyAsync(x => x.Id == request.DealId.Value, cancellationToken);
            if (!exists)
            {
                throw new AppException("Negocio nao encontrado.", 404);
            }
        }

        var activity = new Activity
        {
            CompanyId = user.CompanyId,
            DealId = request.DealId,
            Type = request.Type,
            Description = request.Description.Trim(),
            DueAtUtc = request.DueAtUtc,
            Status = request.Status,
            AssignedUserId = request.AssignedUserId ?? user.UserId
        };

        _dbContext.Activities.Add(activity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.ActivityCreated,
            new { activity.Id, activity.Type, activity.Status },
            cancellationToken: cancellationToken);

        return new ActivityDto
        {
            Id = activity.Id,
            DealId = activity.DealId,
            Type = activity.Type,
            Description = activity.Description,
            DueAtUtc = activity.DueAtUtc,
            Status = activity.Status,
            AssignedUserId = activity.AssignedUserId,
            CreatedAtUtc = activity.CreatedAtUtc
        };
    }

    public async Task<ActivityDto> UpdateAsync(long id, UpdateActivityRequest request, CancellationToken cancellationToken = default)
    {
        var activity = await _dbContext.Activities.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Atividade nao encontrada.", 404);

        activity.Type = request.Type;
        activity.Description = request.Description.Trim();
        activity.DueAtUtc = request.DueAtUtc;
        activity.Status = request.Status;
        activity.AssignedUserId = request.AssignedUserId;
        activity.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.ActivityUpdated,
            new { activity.Id, activity.Status, activity.Type },
            cancellationToken: cancellationToken);

        return new ActivityDto
        {
            Id = activity.Id,
            DealId = activity.DealId,
            Type = activity.Type,
            Description = activity.Description,
            DueAtUtc = activity.DueAtUtc,
            Status = activity.Status,
            AssignedUserId = activity.AssignedUserId,
            CreatedAtUtc = activity.CreatedAtUtc
        };
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var activity = await _dbContext.Activities.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Atividade nao encontrada.", 404);

        _dbContext.Activities.Remove(activity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.ActivityDeleted,
            new { activity.Id, activity.Description },
            cancellationToken: cancellationToken);
    }
}
