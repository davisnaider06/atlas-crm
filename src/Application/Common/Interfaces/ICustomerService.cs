using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Customers;

namespace AtlasCRM.Application.Common.Interfaces;

public interface ICustomerService
{
    Task<PagedResult<CustomerDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        CancellationToken cancellationToken = default);
    Task<CustomerDto> CreateAsync(CreateCustomerRequest request, CancellationToken cancellationToken = default);
    Task<CustomerDto> ConvertLeadAsync(long leadId, CancellationToken cancellationToken = default);
    Task<CustomerDto> UpdateAsync(long id, UpdateCustomerRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
