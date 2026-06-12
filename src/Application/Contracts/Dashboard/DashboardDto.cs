namespace AtlasCRM.Application.Contracts.Dashboard;

public sealed class DashboardDto
{
    public int TotalLeads { get; init; }
    public int OpenDeals { get; init; }
    public decimal PipelineValue { get; init; }
    public int PendingActivities { get; init; }
    public IReadOnlyList<StageSummaryDto> StageSummary { get; init; } = Array.Empty<StageSummaryDto>();

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
