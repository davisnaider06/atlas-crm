using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Security;
using AtlasCRM.Application.Contracts.Team;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize(Policy = CrmPermissions.TeamManage)]
[Route("equipe")]
public sealed class TeamMembersController : ControllerBase
{
    private readonly ITeamMemberService _teamMemberService;

    public TeamMembersController(ITeamMemberService teamMemberService)
    {
        _teamMemberService = teamMemberService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TeamMemberDto>>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _teamMemberService.GetAllAsync(cancellationToken));
    }

    [HttpGet("permissoes")]
    public async Task<ActionResult<IReadOnlyList<PermissionCatalogItemDto>>> GetPermissions(CancellationToken cancellationToken)
    {
        return Ok(await _teamMemberService.GetPermissionCatalogAsync(cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<TeamMemberDto>> Post([FromBody] CreateTeamMemberRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _teamMemberService.CreateAsync(request, cancellationToken));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<TeamMemberDto>> Put(long id, [FromBody] UpdateTeamMemberRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _teamMemberService.UpdateAsync(id, request, cancellationToken));
    }
}
