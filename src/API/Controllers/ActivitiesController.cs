using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Activities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize]
[Route("atividades")]
public sealed class ActivitiesController : ControllerBase
{
    private readonly IActivityService _activityService;

    public ActivitiesController(IActivityService activityService)
    {
        _activityService = activityService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<ActivityDto>>> Get(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _activityService.GetPagedAsync(page, Math.Clamp(pageSize, 1, 100), search, status, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<ActivityDto>> Post([FromBody] CreateActivityRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _activityService.CreateAsync(request, cancellationToken));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ActivityDto>> Put(long id, [FromBody] UpdateActivityRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _activityService.UpdateAsync(id, request, cancellationToken));
    }
}
