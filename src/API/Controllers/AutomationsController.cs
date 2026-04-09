using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Automations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize]
[Route("automacoes")]
public sealed class AutomationsController : ControllerBase
{
    private readonly IAutomationService _automationService;

    public AutomationsController(IAutomationService automationService)
    {
        _automationService = automationService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<AutomationDto>>> Get([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        return Ok(await _automationService.GetPagedAsync(page, Math.Clamp(pageSize, 1, 100), cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<AutomationDto>> Post([FromBody] CreateAutomationRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _automationService.CreateAsync(request, cancellationToken));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await _automationService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
