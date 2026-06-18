namespace AtlasCRM.Application.Contracts.Performance;

/// <summary>Métricas + metas de um vendedor no mês corrente.</summary>
public sealed class SellerPerformanceDto
{
    public long UserId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;

    // Volume / carga
    public int TotalLeads { get; init; }
    public int OpenLeads { get; init; }
    public int Won { get; init; }
    public int Lost { get; init; }
    public int Cold { get; init; }
    public int OverdueFollowUps { get; init; }

    // Eficiência
    public double ConversionRate { get; init; } // % (ganhos / total)
    public decimal AvgTicket { get; init; }

    // Reuniões agendadas (mês) — meta de reuniões
    public int MeetingsScheduledMonth { get; init; }

    // Faturamento — meta de receita
    public decimal RevenueMonth { get; init; }
    public decimal RevenueTotal { get; init; }

    // Metas + progresso
    public decimal RevenueTarget { get; init; }
    public int MeetingsTarget { get; init; }
    public double RevenueProgressPct { get; init; }
    public double MeetingsProgressPct { get; init; }
}

/// <summary>Painel geral (Admin/Gerente): todos os vendedores + totais do time no mês.</summary>
public sealed class PerformanceOverviewDto
{
    public int Year { get; init; }
    public int Month { get; init; }
    public List<SellerPerformanceDto> Sellers { get; init; } = new();

    public decimal TeamRevenueMonth { get; init; }
    public int TeamMeetingsMonth { get; init; }
    public decimal TeamRevenueTarget { get; init; }
    public int TeamMeetingsTarget { get; init; }
}

/// <summary>Definição/edição de meta de um vendedor (Admin).</summary>
public sealed class SetSalesGoalRequest
{
    public decimal RevenueTarget { get; set; } = 15000m;
    public int MeetingsTarget { get; set; } = 16;
}
