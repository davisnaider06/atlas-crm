using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Security;
using AtlasCRM.Application.Contracts.CustomFields;
using AtlasCRM.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Route("custom-fields")]
[Authorize(Policy = CrmPermissions.LeadsView)]
public sealed class CustomFieldsController : ControllerBase
{
    private readonly ICustomFieldService _customFieldService;

    public CustomFieldsController(ICustomFieldService customFieldService)
    {
        _customFieldService = customFieldService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CustomFieldDefinitionDto>>> List(
        [FromQuery] CustomFieldTarget? target,
        CancellationToken cancellationToken)
    {
        return Ok(await _customFieldService.ListAsync(target, cancellationToken));
    }

    [HttpPost]
    [Authorize(Policy = CrmPermissions.SettingsView)]
    public async Task<ActionResult<CustomFieldDefinitionDto>> Create(
        [FromBody] CreateCustomFieldRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _customFieldService.CreateAsync(request, cancellationToken));
    }

    [HttpDelete("{id:long}")]
    [Authorize(Policy = CrmPermissions.SettingsView)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await _customFieldService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
