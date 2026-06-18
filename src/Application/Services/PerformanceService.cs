using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.Performance;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class PerformanceService : IPerformanceService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;

    public PerformanceService(IApplicationDbContext dbContext, ICurrentUserService currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<PerformanceOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuário não autenticado.", 401);
        if (user.Role != UserRole.Admin && user.Role != UserRole.Manager)
        {
            throw new AppException("Apenas administradores e gerentes podem ver o desempenho da equipe.", 403);
        }

        var sellers = await _dbContext.Users.AsNoTracking()
            .Where(u => u.IsActive && u.Role == UserRole.Sales)
            .OrderBy(u => u.Name)
            .Select(u => new { u.Id, u.Name, u.Role })
            .ToListAsync(cancellationToken);

        var sellerIds = sellers.Select(s => s.Id).ToList();
        var metrics = await ComputeAsync(sellerIds, cancellationToken);
        var list = sellers.Select(s => BuildDto(s.Id, s.Name, s.Role.ToString(), metrics)).ToList();

        var now = DateTime.UtcNow;
        return new PerformanceOverviewDto
        {
            Year = now.Year,
            Month = now.Month,
            Sellers = list,
            TeamRevenueMonth = list.Sum(x => x.RevenueMonth),
            TeamMeetingsMonth = list.Sum(x => x.MeetingsScheduledMonth),
            TeamRevenueTarget = list.Sum(x => x.RevenueTarget),
            TeamMeetingsTarget = list.Sum(x => x.MeetingsTarget),
        };
    }

    public async Task<SellerPerformanceDto> GetMyPerformanceAsync(CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuário não autenticado.", 401);
        var me = await _dbContext.Users.AsNoTracking()
            .Where(u => u.Id == user.UserId)
            .Select(u => new { u.Id, u.Name, u.Role })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new AppException("Usuário não encontrado.", 404);

        var metrics = await ComputeAsync(new List<long> { me.Id }, cancellationToken);
        return BuildDto(me.Id, me.Name, me.Role.ToString(), metrics);
    }

    public async Task<SellerPerformanceDto> SetGoalAsync(long userId, SetSalesGoalRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuário não autenticado.", 401);
        if (user.Role != UserRole.Admin)
        {
            throw new AppException("Apenas administradores podem definir metas.", 403);
        }

        var target = await _dbContext.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.Id, u.Name, u.Role, u.CompanyId })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new AppException("Vendedor não encontrado.", 404);

        var goal = await _dbContext.SalesGoals.FirstOrDefaultAsync(g => g.UserId == userId, cancellationToken);
        if (goal is null)
        {
            goal = new SalesGoal { CompanyId = target.CompanyId, UserId = userId };
            _dbContext.SalesGoals.Add(goal);
        }
        goal.RevenueTarget = Math.Max(0, request.RevenueTarget);
        goal.MeetingsTarget = Math.Max(0, request.MeetingsTarget);
        goal.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        var metrics = await ComputeAsync(new List<long> { userId }, cancellationToken);
        return BuildDto(target.Id, target.Name, target.Role.ToString(), metrics);
    }

    // ---------------- cálculo ----------------

    private sealed class SellerMetrics
    {
        public int TotalLeads;
        public int OpenLeads;
        public int Won;
        public int Lost;
        public int Cold;
        public int OverdueFollowUps;
        public int MeetingsScheduledMonth;
        public decimal RevenueMonth;
        public decimal RevenueTotal;
        public decimal RevenueTarget = 15000m;
        public int MeetingsTarget = 16;
    }

    private async Task<Dictionary<long, SellerMetrics>> ComputeAsync(List<long> sellerIds, CancellationToken ct)
    {
        var map = sellerIds.ToDictionary(id => id, _ => new SellerMetrics());
        if (sellerIds.Count == 0) return map;

        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1);

        // Contagens de leads por dono.
        var leadAgg = await _dbContext.Leads.AsNoTracking()
            .Where(l => l.OwnerUserId != null && sellerIds.Contains(l.OwnerUserId!.Value))
            .GroupBy(l => l.OwnerUserId!.Value)
            .Select(g => new
            {
                OwnerUserId = g.Key,
                Total = g.Count(),
                Open = g.Sum(x => x.FunnelStage != FunnelStage.Closed ? 1 : 0),
                Won = g.Sum(x => x.Outcome == FunnelOutcome.Won ? 1 : 0),
                Lost = g.Sum(x => x.Outcome == FunnelOutcome.Lost ? 1 : 0),
                Cold = g.Sum(x => x.IsCold ? 1 : 0),
                Overdue = g.Sum(x => x.NextFollowUpAtUtc != null && x.NextFollowUpAtUtc < now && x.Outcome == FunnelOutcome.None ? 1 : 0),
            })
            .ToListAsync(ct);

        foreach (var a in leadAgg)
        {
            if (!map.TryGetValue(a.OwnerUserId, out var m)) continue;
            m.TotalLeads = a.Total;
            m.OpenLeads = a.Open;
            m.Won = a.Won;
            m.Lost = a.Lost;
            m.Cold = a.Cold;
            m.OverdueFollowUps = a.Overdue;
        }

        // Mapa lead -> dono (reaproveitado por receita e reuniões).
        var leadOwners = await _dbContext.Leads.AsNoTracking()
            .Where(l => l.OwnerUserId != null && sellerIds.Contains(l.OwnerUserId!.Value))
            .Select(l => new { l.Id, OwnerUserId = l.OwnerUserId!.Value })
            .ToListAsync(ct);
        var ownerByLead = leadOwners.ToDictionary(x => x.Id, x => x.OwnerUserId);

        // Faturamento: lançamentos de receita vinculados aos leads dos vendedores.
        var financeRows = await _dbContext.FinanceEntries.AsNoTracking()
            .Where(f => f.Type == "income" && f.SourceLeadId != null)
            .Select(f => new { f.SourceLeadId, f.Amount, f.OccurredAtUtc })
            .ToListAsync(ct);

        foreach (var r in financeRows)
        {
            if (r.SourceLeadId is null || !ownerByLead.TryGetValue(r.SourceLeadId.Value, out var ownerId)) continue;
            if (!map.TryGetValue(ownerId, out var m)) continue;
            m.RevenueTotal += r.Amount;
            if (r.OccurredAtUtc >= monthStart && r.OccurredAtUtc < monthEnd) m.RevenueMonth += r.Amount;
        }

        // Reuniões agendadas no mês: eventos de mudança de etapa -> "Reunião agendada".
        var events = await _dbContext.EventLogs.AsNoTracking()
            .Where(e => e.Type == EventLogType.LeadStageChanged && e.OccurredAtUtc >= monthStart && e.OccurredAtUtc < monthEnd)
            .Select(e => e.DataJson)
            .ToListAsync(ct);

        var meetingsPerOwner = new Dictionary<long, HashSet<long>>();
        foreach (var json in events)
        {
            if (ReadJsonField(json, "To") != nameof(FunnelStage.MeetingScheduled)) continue;
            if (!long.TryParse(ReadJsonField(json, "Id"), out var leadId)) continue;
            if (!ownerByLead.TryGetValue(leadId, out var ownerId)) continue;
            if (!meetingsPerOwner.TryGetValue(ownerId, out var set))
            {
                set = new HashSet<long>();
                meetingsPerOwner[ownerId] = set;
            }
            set.Add(leadId);
        }
        foreach (var (ownerId, set) in meetingsPerOwner)
        {
            if (map.TryGetValue(ownerId, out var m)) m.MeetingsScheduledMonth = set.Count;
        }

        // Metas (default quando não há linha definida).
        var goals = await _dbContext.SalesGoals.AsNoTracking()
            .Where(g => sellerIds.Contains(g.UserId))
            .ToListAsync(ct);
        foreach (var g in goals)
        {
            if (map.TryGetValue(g.UserId, out var m))
            {
                m.RevenueTarget = g.RevenueTarget;
                m.MeetingsTarget = g.MeetingsTarget;
            }
        }

        return map;
    }

    private static SellerPerformanceDto BuildDto(long id, string name, string role, Dictionary<long, SellerMetrics> metrics)
    {
        var m = metrics.TryGetValue(id, out var found) ? found : new SellerMetrics();
        var conversion = m.TotalLeads > 0 ? Math.Round((double)m.Won / m.TotalLeads * 100, 1) : 0;
        var ticket = m.Won > 0 ? Math.Round(m.RevenueTotal / m.Won, 2) : 0m;
        var revenuePct = m.RevenueTarget > 0 ? Math.Round((double)(m.RevenueMonth / m.RevenueTarget) * 100, 1) : 0;
        var meetingsPct = m.MeetingsTarget > 0 ? Math.Round((double)m.MeetingsScheduledMonth / m.MeetingsTarget * 100, 1) : 0;

        return new SellerPerformanceDto
        {
            UserId = id,
            Name = name,
            Role = role,
            TotalLeads = m.TotalLeads,
            OpenLeads = m.OpenLeads,
            Won = m.Won,
            Lost = m.Lost,
            Cold = m.Cold,
            OverdueFollowUps = m.OverdueFollowUps,
            ConversionRate = conversion,
            AvgTicket = ticket,
            MeetingsScheduledMonth = m.MeetingsScheduledMonth,
            RevenueMonth = m.RevenueMonth,
            RevenueTotal = m.RevenueTotal,
            RevenueTarget = m.RevenueTarget,
            MeetingsTarget = m.MeetingsTarget,
            RevenueProgressPct = revenuePct,
            MeetingsProgressPct = meetingsPct,
        };
    }

    private static string? ReadJsonField(string json, string field)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty(field, out var el))
            {
                return el.ValueKind == JsonValueKind.String ? el.GetString() : el.ToString();
            }
            return null;
        }
        catch
        {
            return null;
        }
    }
}
