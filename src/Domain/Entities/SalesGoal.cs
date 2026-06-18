using AtlasCRM.Domain.Common;

namespace AtlasCRM.Domain.Entities;

/// <summary>
/// Meta mensal de um vendedor. Uma linha por vendedor (company_id + user_id).
/// O progresso é calculado para o mês corrente (faturamento fechado e reuniões agendadas).
/// </summary>
public sealed class SalesGoal : TenantEntity
{
    public long UserId { get; set; }
    /// <summary>Meta de faturamento no mês (R$). Padrão inicial: 15.000.</summary>
    public decimal RevenueTarget { get; set; } = 15000m;
    /// <summary>Meta de reuniões agendadas no mês. Padrão inicial: 16.</summary>
    public int MeetingsTarget { get; set; } = 16;

    public User? User { get; set; }
}
