using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Deals;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IDealService
{
    Task<PagedResult<DealDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        long? stageId = null,
        string? status = null,
        CancellationToken cancellationToken = default);
    Task<DealDto> CreateAsync(CreateDealRequest request, CancellationToken cancellationToken = default);
    Task<DealDto> UpdateAsync(long id, UpdateDealRequest request, CancellationToken cancellationToken = default);
    Task<DealDto> MoveAsync(long id, MoveDealRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
