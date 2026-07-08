using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Security;
using AtlasCRM.Application.Contracts.Goals;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize]
[Route("metas")]
public sealed class GoalsController : ControllerBase
{
    private readonly IGoalService _goalService;

    public GoalsController(IGoalService goalService)
    {
        _goalService = goalService;
    }

    /// <summary>Briefing do dia do SDR logado (meta + tarefas). Acessível a qualquer usuário.</summary>
    [HttpGet("me")]
    public async Task<ActionResult<DailyBriefingDto>> GetMyBriefing(CancellationToken cancellationToken)
    {
        return Ok(await _goalService.GetMyBriefingAsync(cancellationToken));
    }

    /// <summary>Metas + progresso de toda a equipe (somente gestão).</summary>
    [HttpGet]
    [Authorize(Policy = CrmPermissions.TeamManage)]
    public async Task<ActionResult<IReadOnlyList<SdrGoalDto>>> GetTeamGoals(CancellationToken cancellationToken)
    {
        return Ok(await _goalService.GetTeamGoalsAsync(cancellationToken));
    }

    /// <summary>Define/atualiza a meta mensal de um SDR (somente gestão).</summary>
    [HttpPut("{userId:long}")]
    [Authorize(Policy = CrmPermissions.TeamManage)]
    public async Task<ActionResult<SdrGoalDto>> SetGoal(long userId, [FromBody] UpdateGoalRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _goalService.SetGoalAsync(userId, request.MonthlyTarget, cancellationToken));
    }
}
