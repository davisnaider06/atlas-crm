namespace AtlasCRM.Application.Contracts.Dashboard;

public sealed class DashboardDto
{
    public int TotalLeads { get; init; }
    public int OpenDeals { get; init; }
    public decimal PipelineValue { get; init; }
    public int PendingActivities { get; init; }
    public IReadOnlyList<StageSummaryDto> StageSummary { get; init; } = Array.Empty<StageSummaryDto>();
    /// <summary>Conversão/abandono por etapa do funil comercial (7 etapas).</summary>
    public IReadOnlyList<FunnelConversionStageDto> FunnelConversion { get; init; } = Array.Empty<FunnelConversionStageDto>();

    // --- Filtro de período (24h | 7d | 30d | year) ---
    /// <summary>Período aplicado (eco do parâmetro recebido).</summary>
    public string Period { get; init; } = "30d";
    /// <summary>Leads criados dentro do período selecionado.</summary>
    public int PeriodNewLeads { get; init; }
    /// <summary>Negócios criados dentro do período selecionado.</summary>
    public int PeriodNewDeals { get; init; }
    /// <summary>Série temporal de leads/negócios criados no período (buckets por hora/dia/mês).</summary>
    public IReadOnlyList<TrendPointDto> PeriodTrend { get; init; } = Array.Empty<TrendPointDto>();

    // --- Métricas do processo comercial (sem conta manual) ---
    // Semana (movimentações de etapa nos últimos 7 dias)
    public int WeeklyMessagesSent { get; init; }       // leads movidos para Prospectado
    public int WeeklyReplies { get; init; }            // leads movidos para Respondeu
    public double WeeklyResponseRate { get; init; }    // respostas / mensagens enviadas
    public int WeeklyMeetingsScheduled { get; init; }  // leads movidos para Reunião agendada
    public int WeeklyProposalsSent { get; init; }      // leads movidos para Proposta enviada

    // Mês
    public int MonthlyClosedWon { get; init; }         // fechamentos (Ganho) no mês
    public decimal MonthlyRevenue { get; init; }       // receita total do mês (do financeiro)
}
