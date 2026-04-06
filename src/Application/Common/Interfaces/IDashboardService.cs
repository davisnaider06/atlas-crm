using AtlasCRM.Application.Contracts.Dashboard;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IDashboardService
{
    Task<DashboardDto> GetAsync(CancellationToken cancellationToken = default);
}
