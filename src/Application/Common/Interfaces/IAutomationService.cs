using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Automations;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IAutomationService
{
    Task<PagedResult<AutomationDto>> GetPagedAsync(int page, int pageSize, CancellationToken cancellationToken = default);
    Task<AutomationDto> CreateAsync(CreateAutomationRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
