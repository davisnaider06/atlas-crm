using System.Text.Json;
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
        var now = DateTime.UtcNow;
        var startOfWeek = StartOfWeek(now);
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var totalLeads = await _dbContext.Leads.CountAsync(cancellationToken);

        var openDeals = await _dbContext.Deals
            .CountAsync(x => x.Status == DealStatus.Open, cancellationToken);

        var pipelineValue = await _dbContext.Deals
            .Where(x => x.Status == DealStatus.Open)
            .SumAsync(x => (decimal?)x.Value, cancellationToken);

        var pendingActivities = await _dbContext.Activities
            .CountAsync(x => x.Status == ActivityStatus.Pending, cancellationToken);

        var stageSummary = await _dbContext.Deals
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

        // Eventos de mudança de etapa no mês (cobrem a janela semanal e a mensal).
        var stageEvents = await _dbContext.EventLogs
            .AsNoTracking()
            .Where(x => x.Type == EventLogType.LeadStageChanged && x.OccurredAtUtc >= startOfMonth)
            .Select(x => new { x.OccurredAtUtc, x.DataJson })
            .ToListAsync(cancellationToken);

        int WeeklyMovedTo(string stage) =>
            stageEvents.Count(e => e.OccurredAtUtc >= startOfWeek && ReadJsonField(e.DataJson, "To") == stage);

        var weeklyMessages = WeeklyMovedTo(nameof(FunnelStage.Prospected));
        var weeklyReplies = WeeklyMovedTo(nameof(FunnelStage.Replied));
        var weeklyMeetings = WeeklyMovedTo(nameof(FunnelStage.MeetingScheduled));
        var weeklyProposals = WeeklyMovedTo(nameof(FunnelStage.ProposalSent));
        var responseRate = weeklyMessages > 0 ? (double)weeklyReplies / weeklyMessages : 0d;

        var monthlyClosedWon = stageEvents.Count(e =>
            ReadJsonField(e.DataJson, "To") == nameof(FunnelStage.Closed) &&
            ReadJsonField(e.DataJson, "Outcome") == nameof(FunnelOutcome.Won));

        var monthlyRevenue = await _dbContext.FinanceEntries
            .Where(x => x.Type == "income" && x.OccurredAtUtc >= startOfMonth)
            .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;

        return new DashboardDto
        {
            TotalLeads = totalLeads,
            OpenDeals = openDeals,
            PipelineValue = pipelineValue ?? 0m,
            PendingActivities = pendingActivities,
            StageSummary = stageSummary,
            WeeklyMessagesSent = weeklyMessages,
            WeeklyReplies = weeklyReplies,
            WeeklyResponseRate = responseRate,
            WeeklyMeetingsScheduled = weeklyMeetings,
            WeeklyProposalsSent = weeklyProposals,
            MonthlyClosedWon = monthlyClosedWon,
            MonthlyRevenue = monthlyRevenue
        };
    }

    private static DateTime StartOfWeek(DateTime nowUtc)
    {
        var date = nowUtc.Date;
        var diff = ((int)date.DayOfWeek + 6) % 7; // segunda-feira = início da semana
        return DateTime.SpecifyKind(date.AddDays(-diff), DateTimeKind.Utc);
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
