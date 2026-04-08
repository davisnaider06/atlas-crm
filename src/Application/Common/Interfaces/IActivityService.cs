using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Activities;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IActivityService
{
    Task<PagedResult<ActivityDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        string? status = null,
        CancellationToken cancellationToken = default);
    Task<ActivityDto> CreateAsync(CreateActivityRequest request, CancellationToken cancellationToken = default);
    Task<ActivityDto> UpdateAsync(long id, UpdateActivityRequest request, CancellationToken cancellationToken = default);
}
