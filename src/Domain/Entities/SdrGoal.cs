using AtlasCRM.Domain.Common;

namespace AtlasCRM.Domain.Entities;

/// <summary>
/// Meta mensal de receita de um SDR (padrão R$ 20.000). Uma linha por usuário;
/// o progresso é calculado em tempo real a partir dos leads ganhos no mês.
/// </summary>
public sealed class SdrGoal : TenantEntity
{
    public long UserId { get; set; }
    public decimal MonthlyTarget { get; set; } = 20000m;

    public User? User { get; set; }
}
