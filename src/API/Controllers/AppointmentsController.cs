using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Security;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Appointments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Route("agenda")]
[Authorize]
public sealed class AppointmentsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;

    public AppointmentsController(IAppointmentService appointmentService)
    {
        _appointmentService = appointmentService;
    }

    [HttpGet]
    [Authorize(Policy = CrmPermissions.SchedulesView)]
    public async Task<ActionResult<PagedResult<AppointmentDto>>> Get(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _appointmentService.GetPagedAsync(page, pageSize, from, to, status, cancellationToken));
    }

    [HttpPost]
    [Authorize(Policy = CrmPermissions.SchedulesCreate)]
    public async Task<ActionResult<AppointmentDto>> Post([FromBody] CreateAppointmentRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _appointmentService.CreateAsync(request, cancellationToken));
    }

    [HttpPut("{id:long}")]
    [Authorize(Policy = CrmPermissions.SchedulesEdit)]
    public async Task<ActionResult<AppointmentDto>> Put(long id, [FromBody] UpdateAppointmentRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _appointmentService.UpdateAsync(id, request, cancellationToken));
    }

    [HttpDelete("{id:long}")]
    [Authorize(Policy = CrmPermissions.SchedulesDelete)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await _appointmentService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
