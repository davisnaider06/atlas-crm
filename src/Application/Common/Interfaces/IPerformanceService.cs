using AtlasCRM.Application.Contracts.Performance;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IPerformanceService
{
    /// <summary>Painel de todos os vendedores (somente Admin/Gerente).</summary>
    Task<PerformanceOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default);

    /// <summary>Desempenho + meta do usuário atual (o vendedor vê só o dele).</summary>
    Task<SellerPerformanceDto> GetMyPerformanceAsync(CancellationToken cancellationToken = default);

    /// <summary>Define/edita a meta de um vendedor (somente Admin).</summary>
    Task<SellerPerformanceDto> SetGoalAsync(long userId, SetSalesGoalRequest request, CancellationToken cancellationToken = default);
}
