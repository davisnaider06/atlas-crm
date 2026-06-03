using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.Finance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize(Policy = CrmPermissions.FinanceManage)]
[Route("finance")]
public sealed class FinanceController : ControllerBase
{
    private readonly IFinanceService _financeService;

    public FinanceController(IFinanceService financeService)
    {
        _financeService = financeService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<FinanceEntryDto>>> Get([FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        return Ok(await _financeService.GetPagedAsync(page, Math.Clamp(pageSize, 1, 500), cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<FinanceEntryDto>> Post([FromBody] CreateFinanceEntryRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _financeService.CreateAsync(request, cancellationToken));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await _financeService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
