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

    public async Task<DashboardDto> GetAsync(string? period = null, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var startOfWeek = StartOfWeek(now);
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var normalizedPeriod = NormalizePeriod(period);

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

        var funnelConversion = await BuildFunnelConversionAsync(cancellationToken);
        var (periodStart, periodTrend) = await BuildPeriodTrendAsync(normalizedPeriod, now, cancellationToken);

        var periodNewLeads = await _dbContext.Leads
            .CountAsync(x => x.CreatedAtUtc >= periodStart, cancellationToken);
        var periodNewDeals = await _dbContext.Deals
            .CountAsync(x => x.CreatedAtUtc >= periodStart, cancellationToken);

        return new DashboardDto
        {
            TotalLeads = totalLeads,
            OpenDeals = openDeals,
            PipelineValue = pipelineValue ?? 0m,
            PendingActivities = pendingActivities,
            StageSummary = stageSummary,
            FunnelConversion = funnelConversion,
            Period = normalizedPeriod,
            PeriodNewLeads = periodNewLeads,
            PeriodNewDeals = periodNewDeals,
            PeriodTrend = periodTrend,
            WeeklyMessagesSent = weeklyMessages,
            WeeklyReplies = weeklyReplies,
            WeeklyResponseRate = responseRate,
            WeeklyMeetingsScheduled = weeklyMeetings,
            WeeklyProposalsSent = weeklyProposals,
            MonthlyClosedWon = monthlyClosedWon,
            MonthlyRevenue = monthlyRevenue
        };
    }

    // Etapas ativas do funil (Mapped..ProposalSent). Closed é terminal e tratado à parte.
    private static readonly (FunnelStage Stage, int Order, string Label)[] ActiveStages =
    {
        (FunnelStage.Mapped, 1, "Mapeado"),
        (FunnelStage.Prospected, 2, "Prospectado"),
        (FunnelStage.Replied, 3, "Respondeu"),
        (FunnelStage.MeetingScheduled, 4, "Reunião agendada"),
        (FunnelStage.MeetingDone, 5, "Reunião feita"),
        (FunnelStage.ProposalSent, 6, "Proposta enviada"),
    };

    /// <summary>
    /// Calcula, por etapa, quantos leads a alcançaram e a conversão para a próxima.
    /// A "etapa mais avançada" de cada lead vem do histórico de mudanças (EventLog) e do
    /// estado atual, evitando inflar o topo do funil com leads perdidos.
    /// </summary>
    private async Task<IReadOnlyList<FunnelConversionStageDto>> BuildFunnelConversionAsync(CancellationToken cancellationToken)
    {
        // Etapa mais avançada (ativa) já alcançada por cada lead.
        var maxOrderByLead = new Dictionary<long, int>();

        void Bump(long leadId, int order)
        {
            if (order <= 0) return;
            if (!maxOrderByLead.TryGetValue(leadId, out var current) || order > current)
            {
                maxOrderByLead[leadId] = order;
            }
        }

        // 1) Histórico de mudanças de etapa: captura etapas pelas quais o lead passou
        //    mesmo que hoje esteja Fechado/Perdido.
        var stageChangeJson = await _dbContext.EventLogs
            .AsNoTracking()
            .Where(x => x.Type == EventLogType.LeadStageChanged)
            .Select(x => x.DataJson)
            .ToListAsync(cancellationToken);

        foreach (var json in stageChangeJson)
        {
            var leadId = ReadJsonLong(json, "Id");
            var to = ReadJsonField(json, "To");
            if (leadId is null || to is null) continue;
            var stage = ActiveStages.FirstOrDefault(s => s.Stage.ToString() == to);
            if (stage.Order > 0) Bump(leadId.Value, stage.Order);
        }

        // 2) Estado atual dos leads. Won passou por toda a esteira ativa (até Proposta enviada).
        var leads = await _dbContext.Leads
            .AsNoTracking()
            .Select(x => new { x.Id, x.FunnelStage, x.Outcome })
            .ToListAsync(cancellationToken);

        var wonCount = 0;
        foreach (var lead in leads)
        {
            if (lead.FunnelStage == FunnelStage.Closed)
            {
                if (lead.Outcome == FunnelOutcome.Won)
                {
                    wonCount++;
                    Bump(lead.Id, ActiveStages.Length); // alcançou todas as etapas ativas
                }
                continue;
            }

            var active = ActiveStages.FirstOrDefault(s => s.Stage == lead.FunnelStage);
            if (active.Order > 0) Bump(lead.Id, active.Order);
        }

        // 3) reached[s] = quantos leads alcançaram pelo menos a etapa de ordem s.
        var reached = new int[ActiveStages.Length + 1];
        foreach (var order in maxOrderByLead.Values)
        {
            for (var s = 1; s <= order && s <= ActiveStages.Length; s++)
            {
                reached[s]++;
            }
        }

        var result = new List<FunnelConversionStageDto>();
        for (var i = 0; i < ActiveStages.Length; i++)
        {
            var order = ActiveStages[i].Order;
            var reachedHere = reached[order];
            var nextReached = order < ActiveStages.Length ? reached[order + 1] : wonCount;
            result.Add(new FunnelConversionStageDto
            {
                StageName = ActiveStages[i].Label,
                Order = order,
                ReachedCount = reachedHere,
                DroppedCount = Math.Max(0, reachedHere - nextReached),
                ConversionRate = reachedHere > 0 ? (double)nextReached / reachedHere : 0d
            });
        }

        // Etapa terminal: Fechado (Ganho).
        result.Add(new FunnelConversionStageDto
        {
            StageName = "Fechado (Ganho)",
            Order = 7,
            ReachedCount = wonCount,
            DroppedCount = 0,
            ConversionRate = 0d
        });

        return result;
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

    private static string NormalizePeriod(string? period) => period switch
    {
        "24h" => "24h",
        "7d" => "7d",
        "year" => "year",
        _ => "30d",
    };

    private static readonly string[] MonthLabels =
        { "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez" };
    private static readonly string[] WeekdayLabels =
        { "dom", "seg", "ter", "qua", "qui", "sex", "sáb" };

    /// <summary>
    /// Janela do período + série temporal (buckets por hora para 24h, por dia para
    /// 7d/30d, por mês para o ano). Computado no servidor para refletir todos os
    /// dados, não só a página atual.
    /// </summary>
    private async Task<(DateTime PeriodStart, IReadOnlyList<TrendPointDto> Trend)> BuildPeriodTrendAsync(
        string period, DateTime now, CancellationToken cancellationToken)
    {
        DateTime periodStart = period switch
        {
            "24h" => now.AddHours(-24),
            "7d" => DateTime.SpecifyKind(now.Date.AddDays(-6), DateTimeKind.Utc),
            "year" => new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-11),
            _ => DateTime.SpecifyKind(now.Date.AddDays(-29), DateTimeKind.Utc),
        };

        var leadDates = await _dbContext.Leads
            .AsNoTracking()
            .Where(x => x.CreatedAtUtc >= periodStart)
            .Select(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
        var dealDates = await _dbContext.Deals
            .AsNoTracking()
            .Where(x => x.CreatedAtUtc >= periodStart)
            .Select(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var trend = new List<TrendPointDto>();

        if (period == "24h")
        {
            var currentHour = new DateTime(now.Year, now.Month, now.Day, now.Hour, 0, 0, DateTimeKind.Utc);
            for (var i = 23; i >= 0; i--)
            {
                var bucketStart = currentHour.AddHours(-i);
                var bucketEnd = bucketStart.AddHours(1);
                trend.Add(new TrendPointDto
                {
                    Label = bucketStart.ToString("HH'h'"),
                    Leads = leadDates.Count(d => d >= bucketStart && d < bucketEnd),
                    Deals = dealDates.Count(d => d >= bucketStart && d < bucketEnd),
                });
            }
        }
        else if (period == "year")
        {
            var firstMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-11);
            for (var i = 0; i < 12; i++)
            {
                var monthStart = firstMonth.AddMonths(i);
                var monthEnd = monthStart.AddMonths(1);
                trend.Add(new TrendPointDto
                {
                    Label = MonthLabels[monthStart.Month - 1],
                    Leads = leadDates.Count(d => d >= monthStart && d < monthEnd),
                    Deals = dealDates.Count(d => d >= monthStart && d < monthEnd),
                });
            }
        }
        else
        {
            var days = period == "7d" ? 7 : 30;
            var firstDay = DateTime.SpecifyKind(now.Date.AddDays(-(days - 1)), DateTimeKind.Utc);
            for (var i = 0; i < days; i++)
            {
                var dayStart = firstDay.AddDays(i);
                var dayEnd = dayStart.AddDays(1);
                trend.Add(new TrendPointDto
                {
                    Label = days <= 7 ? WeekdayLabels[(int)dayStart.DayOfWeek] : dayStart.ToString("dd/MM"),
                    Leads = leadDates.Count(d => d >= dayStart && d < dayEnd),
                    Deals = dealDates.Count(d => d >= dayStart && d < dayEnd),
                });
            }
        }

        return (periodStart, trend);
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
