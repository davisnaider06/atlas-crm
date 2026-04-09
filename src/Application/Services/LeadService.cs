using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Leads;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class LeadService : ILeadService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IEventLogService _eventLogService;

    public LeadService(IApplicationDbContext dbContext, ICurrentUserService currentUser, IEventLogService eventLogService)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _eventLogService = eventLogService;
    }

    public async Task<PagedResult<LeadDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        string? source = null,
        string? status = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Leads.AsNoTracking().OrderByDescending(x => x.CreatedAtUtc).AsQueryable();

        if (_currentUser.User?.Role == UserRole.Sales)
        {
            query = query.Where(x => x.OwnerUserId == _currentUser.User.UserId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim().ToLowerInvariant();
            query = query.Where(x =>
                x.Name.ToLower().Contains(normalized) ||
                (x.Email != null && x.Email.ToLower().Contains(normalized)) ||
                (x.Phone != null && x.Phone.Contains(normalized)));
        }

        if (!string.IsNullOrWhiteSpace(source))
        {
            var normalizedSource = source.Trim().ToLowerInvariant();
            query = query.Where(x => x.Source.ToLower() == normalizedSource);
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<LeadStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(x => x.Status == parsedStatus);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new LeadDto
            {
                Id = x.Id,
                Name = x.Name,
                Email = x.Email,
                Phone = x.Phone,
                Source = x.Source,
                Status = x.Status,
                OwnerUserId = x.OwnerUserId,
                CreatedAtUtc = x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<LeadDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    public async Task<LeadDto> CreateAsync(CreateLeadRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuario nao autenticado.", 401);
        var lead = new Lead
        {
            CompanyId = user.CompanyId,
            Name = request.Name.Trim(),
            Email = request.Email?.Trim(),
            Phone = request.Phone?.Trim(),
            Source = request.Source.Trim(),
            Status = request.Status,
            OwnerUserId = request.OwnerUserId ?? user.UserId
        };

        _dbContext.Leads.Add(lead);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await ApplyLeadCreatedAutomationsAsync(lead, cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.LeadCreated,
            new { lead.Id, lead.Name, lead.Status },
            cancellationToken: cancellationToken);

        return new LeadDto
        {
            Id = lead.Id,
            Name = lead.Name,
            Email = lead.Email,
            Phone = lead.Phone,
            Source = lead.Source,
            Status = lead.Status,
            OwnerUserId = lead.OwnerUserId,
            CreatedAtUtc = lead.CreatedAtUtc
        };
    }

    public async Task<LeadDto> UpdateAsync(long id, UpdateLeadRequest request, CancellationToken cancellationToken = default)
    {
        var lead = await _dbContext.Leads.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Lead nao encontrado.", 404);

        lead.Name = request.Name.Trim();
        lead.Email = request.Email?.Trim();
        lead.Phone = request.Phone?.Trim();
        lead.Source = request.Source.Trim();
        lead.Status = request.Status;
        lead.OwnerUserId = request.OwnerUserId;
        lead.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.LeadUpdated,
            new { lead.Id, lead.Status },
            cancellationToken: cancellationToken);

        return new LeadDto
        {
            Id = lead.Id,
            Name = lead.Name,
            Email = lead.Email,
            Phone = lead.Phone,
            Source = lead.Source,
            Status = lead.Status,
            OwnerUserId = lead.OwnerUserId,
            CreatedAtUtc = lead.CreatedAtUtc
        };
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var lead = await _dbContext.Leads.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Lead nao encontrado.", 404);

        var hasDeals = await _dbContext.Deals.AnyAsync(x => x.LeadId == id, cancellationToken);
        if (hasDeals)
        {
            throw new AppException("Nao e possivel excluir um lead com negocios vinculados.", 409);
        }

        _dbContext.Leads.Remove(lead);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.LeadDeleted,
            new { lead.Id, lead.Name },
            cancellationToken: cancellationToken);
    }

    private async Task ApplyLeadCreatedAutomationsAsync(Lead lead, CancellationToken cancellationToken)
    {
        var automations = await _dbContext.Automations
            .Where(x => x.EventType == AutomationEventType.LeadCreated && x.IsActive)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        foreach (var automation in automations)
        {
            if (!MatchesLeadCondition(automation.ConditionJson, lead))
            {
                continue;
            }

            var executed = await TryExecuteLeadAutomationAsync(automation, lead, cancellationToken);
            if (!executed)
            {
                continue;
            }

            await _eventLogService.LogAsync(
                EventLogType.AutomationExecuted,
                new { AutomationId = automation.Id, lead.Id, Trigger = "LeadCreated" },
                cancellationToken: cancellationToken);
        }
    }

    private async Task<bool> TryExecuteLeadAutomationAsync(Automation automation, Lead lead, CancellationToken cancellationToken)
    {
        using var actionDoc = JsonDocument.Parse(automation.ActionJson);
        var root = actionDoc.RootElement;

        if (root.TryGetProperty("assignOwnerUserId", out var assignOwnerElement) && assignOwnerElement.TryGetInt64(out var ownerId))
        {
            lead.OwnerUserId = ownerId;
            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        if (root.TryGetProperty("userIds", out var userIdsElement) && userIdsElement.ValueKind == JsonValueKind.Array)
        {
            var userIds = userIdsElement.EnumerateArray()
                .Where(x => x.TryGetInt64(out _))
                .Select(x => x.GetInt64())
                .ToList();

            if (userIds.Count > 0)
            {
                var leadCount = await _dbContext.Leads.CountAsync(cancellationToken);
                lead.OwnerUserId = userIds[(leadCount - 1) % userIds.Count];
                await _dbContext.SaveChangesAsync(cancellationToken);
                return true;
            }
        }

        if (root.TryGetProperty("createTask", out var createTaskElement) && createTaskElement.ValueKind == JsonValueKind.True)
        {
            var description = root.TryGetProperty("taskDescription", out var taskDescription)
                ? taskDescription.GetString() ?? $"Atender lead {lead.Name}"
                : $"Atender lead {lead.Name}";

            _dbContext.Activities.Add(new Activity
            {
                CompanyId = lead.CompanyId,
                DealId = null,
                Type = ActivityType.Task,
                Description = description,
                DueAtUtc = DateTime.UtcNow.AddHours(1),
                Status = ActivityStatus.Pending,
                AssignedUserId = lead.OwnerUserId
            });

            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        return false;
    }

    private static bool MatchesLeadCondition(string conditionJson, Lead lead)
    {
        using var conditionDoc = JsonDocument.Parse(conditionJson);
        var root = conditionDoc.RootElement;

        if (root.TryGetProperty("source", out var sourceElement))
        {
            var source = sourceElement.GetString();
            if (!string.IsNullOrWhiteSpace(source) &&
                !string.Equals(source, "any", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(source, lead.Source, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }

        if (root.TryGetProperty("status", out var statusElement))
        {
            var status = statusElement.GetString();
            if (!string.IsNullOrWhiteSpace(status) &&
                !string.Equals(status, lead.Status.ToString(), StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }

        return true;
    }
}
