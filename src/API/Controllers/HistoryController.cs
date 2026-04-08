using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.History;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize]
[Route("historico")]
public sealed class HistoryController : ControllerBase
{
    private readonly IHistoryService _historyService;

    public HistoryController(IHistoryService historyService)
    {
        _historyService = historyService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<HistoryItemDto>>> Get(
        [FromQuery] long? leadId = null,
        [FromQuery] long? dealId = null,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _historyService.GetAsync(leadId, dealId, cancellationToken));
    }
}
