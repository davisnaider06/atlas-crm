using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Finance;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IFinanceService
{
    Task<PagedResult<FinanceEntryDto>> GetPagedAsync(int page, int pageSize, CancellationToken cancellationToken = default);
    Task<FinanceEntryDto> CreateAsync(CreateFinanceEntryRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
