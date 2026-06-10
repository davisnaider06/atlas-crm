using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Appointments;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IAppointmentService
{
    Task<PagedResult<AppointmentDto>> GetPagedAsync(
        int page,
        int pageSize,
        DateTime? from = null,
        DateTime? to = null,
        string? status = null,
        CancellationToken cancellationToken = default);

    Task<AppointmentDto> CreateAsync(CreateAppointmentRequest request, CancellationToken cancellationToken = default);
    Task<AppointmentDto> UpdateAsync(long id, UpdateAppointmentRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
