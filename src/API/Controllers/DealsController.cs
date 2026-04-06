using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Deals;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize]
[Route("negocios")]
public sealed class DealsController : ControllerBase
{
    private readonly IDealService _dealService;

    public DealsController(IDealService dealService)
    {
        _dealService = dealService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<DealDto>>> Get([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        return Ok(await _dealService.GetPagedAsync(page, Math.Clamp(pageSize, 1, 100), cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<DealDto>> Post([FromBody] CreateDealRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _dealService.CreateAsync(request, cancellationToken));
    }

    [HttpPut("{id:long}/mover")]
    public async Task<ActionResult<DealDto>> Move(long id, [FromBody] MoveDealRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _dealService.MoveAsync(id, request, cancellationToken));
    }
}
