using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Automations;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class AutomationService : IAutomationService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IEventLogService _eventLogService;

    public AutomationService(IApplicationDbContext dbContext, ICurrentUserService currentUser, IEventLogService eventLogService)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _eventLogService = eventLogService;
    }

    public async Task<PagedResult<AutomationDto>> GetPagedAsync(int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Automations.AsNoTracking().OrderByDescending(x => x.CreatedAtUtc);
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new AutomationDto
            {
                Id = x.Id,
                Name = x.Name,
                EventType = x.EventType,
                ConditionJson = x.ConditionJson,
                ActionJson = x.ActionJson,
                IsActive = x.IsActive,
                CreatedAtUtc = x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<AutomationDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    public async Task<AutomationDto> CreateAsync(CreateAutomationRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuario nao autenticado.", 401);
        var company = await _dbContext.Companies.AsNoTracking().FirstAsync(x => x.Id == user.CompanyId, cancellationToken);
        var count = await _dbContext.Automations.CountAsync(cancellationToken);

        var maxAutomations = company.Plan switch
        {
            PlanType.Starter => 5,
            PlanType.Growth => 25,
            _ => 100
        };

        if (count >= maxAutomations)
        {
            throw new AppException("Limite de automacoes do plano atingido.", 409);
        }

        var automation = new Automation
        {
            CompanyId = user.CompanyId,
            Name = request.Name.Trim(),
            EventType = request.EventType,
            ConditionJson = request.ConditionJson,
            ActionJson = request.ActionJson,
            IsActive = request.IsActive
        };

        _dbContext.Automations.Add(automation);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.AutomationCreated,
            new { automation.Id, automation.EventType },
            cancellationToken: cancellationToken);

        return new AutomationDto
        {
            Id = automation.Id,
            Name = automation.Name,
            EventType = automation.EventType,
            ConditionJson = automation.ConditionJson,
            ActionJson = automation.ActionJson,
            IsActive = automation.IsActive,
            CreatedAtUtc = automation.CreatedAtUtc
        };
    }
}
