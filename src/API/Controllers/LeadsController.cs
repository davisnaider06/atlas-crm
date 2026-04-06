using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Leads;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize]
[Route("leads")]
public sealed class LeadsController : ControllerBase
{
    private readonly ILeadService _leadService;

    public LeadsController(ILeadService leadService)
    {
        _leadService = leadService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<LeadDto>>> Get([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        return Ok(await _leadService.GetPagedAsync(page, Math.Clamp(pageSize, 1, 100), cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<LeadDto>> Post([FromBody] CreateLeadRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _leadService.CreateAsync(request, cancellationToken));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<LeadDto>> Put(long id, [FromBody] UpdateLeadRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _leadService.UpdateAsync(id, request, cancellationToken));
    }
}
