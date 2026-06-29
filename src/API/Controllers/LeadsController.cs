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
    private readonly ILeadInteractionService _interactionService;

    public LeadsController(ILeadService leadService, ILeadInteractionService interactionService)
    {
        _leadService = leadService;
        _interactionService = interactionService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<LeadDto>>> Get(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? source = null,
        [FromQuery] string? status = null,
        [FromQuery] long? ownerUserId = null,
        [FromQuery] string? leadType = null,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _leadService.GetPagedAsync(page, Math.Clamp(pageSize, 1, 500), search, source, status, ownerUserId, leadType, cancellationToken));
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

    [HttpPost("{id:long}/followup")]
    [Authorize(Policy = CrmPermissions.LeadsEdit)]
    public async Task<ActionResult<LeadDto>> AdvanceFollowUp(long id, CancellationToken cancellationToken)
    {
        return Ok(await _leadService.AdvanceFollowUpAsync(id, cancellationToken));
    }

    [HttpDelete("{id:long}")]
    [Authorize(Policy = CrmPermissions.LeadsDelete)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await _leadService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(CancellationToken cancellationToken)
    {
        var bytes = await _leadService.ExportToExcelAsync(cancellationToken);
        var fileName = $"leads-{DateTime.UtcNow:yyyy-MM-dd}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    [HttpPost("import")]
    [Authorize(Policy = CrmPermissions.LeadsCreate)]
    [RequestSizeLimit(20_000_000)] // ~20 MB
    public async Task<ActionResult<LeadImportResultDto>> Import(
        IFormFile file,
        [FromForm] bool distribute = true,
        [FromForm] string? ownerUserIds = null,
        [FromForm] string phoneDuplicateMode = "ask",
        [FromForm] string leadType = "Inbound",
        CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { error = "Envie um arquivo .csv ou .xlsx." });
        }

        // ownerUserIds chega como lista separada por vírgula (ex: "3,5,8").
        var owners = (ownerUserIds ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => long.TryParse(x, out var id) ? id : (long?)null)
            .Where(x => x.HasValue)
            .Select(x => x!.Value)
            .ToList();

        var parsedType = Enum.TryParse<AtlasCRM.Domain.Enums.LeadType>(leadType, true, out var t)
            ? t
            : AtlasCRM.Domain.Enums.LeadType.Inbound;

        await using var stream = file.OpenReadStream();
        var result = await _leadService.ImportAsync(stream, file.FileName, distribute, owners, phoneDuplicateMode, parsedType, cancellationToken);
        return Ok(result);
    }

    [HttpDelete]
    [Authorize(Policy = CrmPermissions.LeadsDelete)]
    public async Task<ActionResult<LeadClearResultDto>> ClearAll(CancellationToken cancellationToken)
    {
        return Ok(await _leadService.ClearAllAsync(cancellationToken));
    }

    [HttpGet("{id:long}/interacoes")]
    public async Task<ActionResult<IReadOnlyList<LeadInteractionDto>>> GetInteractions(long id, CancellationToken cancellationToken)
    {
        return Ok(await _interactionService.GetByLeadAsync(id, cancellationToken));
    }

    [HttpPost("{id:long}/interacoes")]
    [Authorize(Policy = CrmPermissions.LeadsEdit)]
    public async Task<ActionResult<LeadInteractionDto>> CreateInteraction(long id, [FromBody] CreateLeadInteractionRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _interactionService.CreateAsync(id, request, cancellationToken));
    }

    [HttpDelete("interacoes/{interactionId:long}")]
    [Authorize(Policy = CrmPermissions.LeadsEdit)]
    public async Task<IActionResult> DeleteInteraction(long interactionId, CancellationToken cancellationToken)
    {
        await _interactionService.DeleteAsync(interactionId, cancellationToken);
        return NoContent();
    }
}
