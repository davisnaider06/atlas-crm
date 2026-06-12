using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Common.Security;
using AtlasCRM.Application.Contracts.Leads;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize(Policy = CrmPermissions.LeadsView)]
[Route("leads")]
public sealed class LeadsController : ControllerBase
{
    private readonly ILeadService _leadService;

    public LeadsController(ILeadService leadService)
    {
        _leadService = leadService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<LeadDto>>> Get(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? source = null,
        [FromQuery] string? status = null,
        [FromQuery] long? ownerUserId = null,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _leadService.GetPagedAsync(page, Math.Clamp(pageSize, 1, 100), search, source, status, ownerUserId, cancellationToken));
    }

    [HttpGet("vendedores")]
    public async Task<ActionResult<IReadOnlyList<LeadOwnerDto>>> GetOwners(CancellationToken cancellationToken = default)
    {
        return Ok(await _leadService.GetOwnersAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize(Policy = CrmPermissions.LeadsCreate)]
    public async Task<ActionResult<LeadDto>> Post([FromBody] CreateLeadRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _leadService.CreateAsync(request, cancellationToken));
    }

    [HttpPut("{id:long}")]
    [Authorize(Policy = CrmPermissions.LeadsEdit)]
    public async Task<ActionResult<LeadDto>> Put(long id, [FromBody] UpdateLeadRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _leadService.UpdateAsync(id, request, cancellationToken));
    }

    [HttpPost("{id:long}/move")]
    [Authorize(Policy = CrmPermissions.LeadsEdit)]
    public async Task<ActionResult<LeadDto>> Move(long id, [FromBody] MoveLeadStageRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _leadService.MoveStageAsync(id, request, cancellationToken));
    }

    [HttpDelete("{id:long}")]
    [Authorize(Policy = CrmPermissions.LeadsDelete)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await _leadService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
