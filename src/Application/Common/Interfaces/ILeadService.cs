using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Leads;

namespace AtlasCRM.Application.Common.Interfaces;

public interface ILeadService
{
    Task<PagedResult<LeadDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        string? source = null,
        string? status = null,
        long? ownerUserId = null,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LeadOwnerDto>> GetOwnersAsync(CancellationToken cancellationToken = default);
    Task<LeadDto> CreateAsync(CreateLeadRequest request, CancellationToken cancellationToken = default);
    Task<LeadDto> UpdateAsync(long id, UpdateLeadRequest request, CancellationToken cancellationToken = default);
    Task<LeadDto> MoveStageAsync(long id, MoveLeadStageRequest request, CancellationToken cancellationToken = default);
    Task<LeadDto> AdvanceFollowUpAsync(long id, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
