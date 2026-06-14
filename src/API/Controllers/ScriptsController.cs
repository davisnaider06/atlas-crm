using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Security;
using AtlasCRM.Application.Contracts.Scripts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize(Policy = CrmPermissions.LeadsView)]
[Route("scripts")]
public sealed class ScriptsController : ControllerBase
{
    private readonly IScriptService _scriptService;

    public ScriptsController(IScriptService scriptService)
    {
        _scriptService = scriptService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ScriptDto>>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _scriptService.GetAllAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize(Policy = CrmPermissions.LeadsEdit)]
    public async Task<ActionResult<ScriptDto>> Post([FromBody] SaveScriptRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _scriptService.CreateAsync(request, cancellationToken));
    }

    [HttpPut("{id:long}")]
    [Authorize(Policy = CrmPermissions.LeadsEdit)]
    public async Task<ActionResult<ScriptDto>> Put(long id, [FromBody] SaveScriptRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _scriptService.UpdateAsync(id, request, cancellationToken));
    }

    [HttpDelete("{id:long}")]
    [Authorize(Policy = CrmPermissions.LeadsEdit)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await _scriptService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
