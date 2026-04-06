using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Deals;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IDealService
{
    Task<PagedResult<DealDto>> GetPagedAsync(int page, int pageSize, CancellationToken cancellationToken = default);
    Task<DealDto> CreateAsync(CreateDealRequest request, CancellationToken cancellationToken = default);
    Task<DealDto> MoveAsync(long id, MoveDealRequest request, CancellationToken cancellationToken = default);
}
