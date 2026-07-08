using System.Text.Json;
using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.Goals;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class GoalService : IGoalService
{
    private const decimal DefaultMonthlyTarget = 20000m;

    private static readonly string[] MonthLabels =
        { "janeiro", "fevereiro", "março", "abril", "maio", "junho",
          "julho", "agosto", "setembro", "outubro", "novembro", "dezembro" };

    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;

    public GoalService(IApplicationDbContext dbContext, ICurrentUserService currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<DailyBriefingDto> GetMyBriefingAsync(CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuário não autenticado.", 401);
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var achievedByOwner = await ComputeAchievedByOwnerAsync(startOfMonth, cancellationToken);
        var target = await GetTargetAsync(user.UserId, cancellationToken);

        var userRow = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == user.UserId, cancellationToken);

        var goal = BuildGoalDto(
            user.UserId,
            userRow?.Name ?? user.Email,
            target,
            achievedByOwner.TryGetValue(user.UserId, out var mine) ? mine : (0m, 0));

        var tasks = await BuildDailyTasksAsync(user.UserId, now, cancellationToken);

        return new DailyBriefingDto
        {
            Goal = goal,
            Tasks = tasks,
            MonthLabel = $"{MonthLabels[now.Month - 1]} de {now.Year}",
        };
    }

    public async Task<IReadOnlyList<SdrGoalDto>> GetTeamGoalsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var achievedByOwner = await ComputeAchievedByOwnerAsync(startOfMonth, cancellationToken);

        var users = await _dbContext.Users
            .AsNoTracking()
            .Where(x => x.IsActive)
            .Select(x => new { x.Id, x.Name })
            .ToListAsync(cancellationToken);

        var goals = await _dbContext.SdrGoals
            .AsNoTracking()
            .ToDictionaryAsync(x => x.UserId, x => x.MonthlyTarget, cancellationToken);

        return users
            .Select(u => BuildGoalDto(
                u.Id,
                u.Name,
                goals.TryGetValue(u.Id, out var t) ? t : DefaultMonthlyTarget,
                achievedByOwner.TryGetValue(u.Id, out var a) ? a : (0m, 0)))
            .OrderByDescending(x => x.Achieved)
            .ToList();
    }

    public async Task<SdrGoalDto> SetGoalAsync(long userId, decimal monthlyTarget, CancellationToken cancellationToken = default)
    {
        if (monthlyTarget < 0) throw new AppException("A meta não pode ser negativa.", 400);

        var userRow = await _dbContext.Users
            .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken)
            ?? throw new AppException("Usuário não encontrado.", 404);

        var goal = await _dbContext.SdrGoals
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

        if (goal is null)
        {
            goal = new SdrGoal { UserId = userId, MonthlyTarget = monthlyTarget };
            _dbContext.SdrGoals.Add(goal);
        }
        else
        {
            goal.MonthlyTarget = monthlyTarget;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var achievedByOwner = await ComputeAchievedByOwnerAsync(startOfMonth, cancellationToken);

        return BuildGoalDto(
            userId,
            userRow.Name,
            monthlyTarget,
            achievedByOwner.TryGetValue(userId, out var a) ? a : (0m, 0));
    }

    private async Task<decimal> GetTargetAsync(long userId, CancellationToken cancellationToken)
    {
        var goal = await _dbContext.SdrGoals
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        return goal?.MonthlyTarget ?? DefaultMonthlyTarget;
    }

    /// <summary>
    /// Receita ganha no mês por dono do lead: leads que foram fechados (Ganho)
    /// ou convertidos dentro do mês corrente, somando o valor de contrato.
    /// A janela do mês vem do EventLog (mesma fonte do dashboard).
    /// </summary>
    private async Task<Dictionary<long, (decimal Value, int Count)>> ComputeAchievedByOwnerAsync(
        DateTime startOfMonth, CancellationToken cancellationToken)
    {
        var events = await _dbContext.EventLogs
            .AsNoTracking()
            .Where(x => x.OccurredAtUtc >= startOfMonth &&
                        (x.Type == EventLogType.LeadConverted || x.Type == EventLogType.LeadStageChanged))
            .Select(x => new { x.Type, x.DataJson })
            .ToListAsync(cancellationToken);

        var wonLeadIds = new HashSet<long>();
        foreach (var e in events)
        {
            var id = ReadJsonLong(e.DataJson, "Id");
            if (id is null) continue;

            if (e.Type == EventLogType.LeadConverted)
            {
                wonLeadIds.Add(id.Value);
            }
            else if (ReadJsonField(e.DataJson, "To") == nameof(FunnelStage.Closed) &&
                     ReadJsonField(e.DataJson, "Outcome") == nameof(FunnelOutcome.Won))
            {
                wonLeadIds.Add(id.Value);
            }
        }

        var result = new Dictionary<long, (decimal Value, int Count)>();
        if (wonLeadIds.Count == 0) return result;

        var ids = wonLeadIds.ToList();
        var leads = await _dbContext.Leads
            .AsNoTracking()
            .Where(x => ids.Contains(x.Id) && x.OwnerUserId != null)
            .Select(x => new { OwnerUserId = x.OwnerUserId!.Value, x.ContractValue })
            .ToListAsync(cancellationToken);

        foreach (var lead in leads)
        {
            var current = result.TryGetValue(lead.OwnerUserId, out var acc) ? acc : (0m, 0);
            result[lead.OwnerUserId] = (current.Item1 + (lead.ContractValue ?? 0m), current.Item2 + 1);
        }

        return result;
    }

    private async Task<IReadOnlyList<DailyTaskDto>> BuildDailyTasksAsync(
        long userId, DateTime now, CancellationToken cancellationToken)
    {
        var startOfToday = DateTime.SpecifyKind(now.Date, DateTimeKind.Utc);
        var endOfToday = startOfToday.AddDays(1);

        var leads = await _dbContext.Leads
            .AsNoTracking()
            .Where(x => x.OwnerUserId == userId && x.FunnelStage != FunnelStage.Closed)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.NextFollowUpAtUtc,
                x.LastContactAtUtc,
                x.QualificationTemperature,
            })
            .ToListAsync(cancellationToken);

        var tasks = new List<DailyTaskDto>();

        foreach (var lead in leads)
        {
            if (lead.NextFollowUpAtUtc is { } next)
            {
                if (next < startOfToday)
                {
                    tasks.Add(new DailyTaskDto
                    {
                        Id = $"overdue-{lead.Id}",
                        Type = "overdue_followup",
                        Title = $"Follow-up atrasado: {lead.Name}",
                        Priority = "high",
                        LeadId = lead.Id,
                        LeadName = lead.Name,
                        DueAtUtc = next,
                    });
                    continue;
                }

                if (next >= startOfToday && next < endOfToday)
                {
                    tasks.Add(new DailyTaskDto
                    {
                        Id = $"today-{lead.Id}",
                        Type = "today_followup",
                        Title = $"Follow-up de hoje: {lead.Name}",
                        Priority = "high",
                        LeadId = lead.Id,
                        LeadName = lead.Name,
                        DueAtUtc = next,
                    });
                    continue;
                }
            }

            if (lead.LastContactAtUtc is null)
            {
                tasks.Add(new DailyTaskDto
                {
                    Id = $"nocontact-{lead.Id}",
                    Type = "no_contact",
                    Title = $"Primeiro contato: {lead.Name}",
                    Priority = "normal",
                    LeadId = lead.Id,
                    LeadName = lead.Name,
                });
                continue;
            }

            if (lead.QualificationTemperature == LeadTemperature.Hot && lead.NextFollowUpAtUtc is null)
            {
                tasks.Add(new DailyTaskDto
                {
                    Id = $"hot-{lead.Id}",
                    Type = "hot_no_next",
                    Title = $"Lead quente sem próximo passo: {lead.Name}",
                    Priority = "high",
                    LeadId = lead.Id,
                    LeadName = lead.Name,
                });
            }
        }

        // Prioriza tarefas de alta prioridade e as com vencimento mais antigo.
        return tasks
            .OrderByDescending(t => t.Priority == "high")
            .ThenBy(t => t.DueAtUtc ?? DateTime.MaxValue)
            .Take(30)
            .ToList();
    }

    private static SdrGoalDto BuildGoalDto(long userId, string name, decimal target, (decimal Value, int Count) achieved)
    {
        var pct = target > 0 ? (double)(achieved.Value / target) * 100d : 0d;
        return new SdrGoalDto
        {
            UserId = userId,
            UserName = name,
            MonthlyTarget = target,
            Achieved = achieved.Value,
            Remaining = Math.Max(0m, target - achieved.Value),
            ProgressPct = Math.Round(pct, 1),
            WonDeals = achieved.Count,
        };
    }

    private static long? ReadJsonLong(string json, string field)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty(field, out var value))
            {
                if (value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out var l)) return l;
                if (value.ValueKind == JsonValueKind.String && long.TryParse(value.GetString(), out var s)) return s;
            }
            return null;
        }
        catch
        {
            return null;
        }
    }

    private static string? ReadJsonField(string json, string field)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty(field, out var value) ? value.GetString() : null;
        }
        catch
        {
            return null;
        }
    }
}
