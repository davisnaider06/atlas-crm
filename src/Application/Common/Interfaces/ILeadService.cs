using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Leads;

namespace AtlasCRM.Application.Common.Interfaces;

public interface ILeadService
{
    Task<PagedResult<LeadDto>> GetPagedAsync(int page, int pageSize, CancellationToken cancellationToken = default);
    Task<LeadDto> CreateAsync(CreateLeadRequest request, CancellationToken cancellationToken = default);
    Task<LeadDto> UpdateAsync(long id, UpdateLeadRequest request, CancellationToken cancellationToken = default);
}
