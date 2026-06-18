using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.Performance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize]
[Route("desempenho")]
public sealed class DesempenhoController : ControllerBase
{
    private readonly IPerformanceService _performanceService;

    public DesempenhoController(IPerformanceService performanceService)
    {
        _performanceService = performanceService;
    }

    /// <summary>Painel de todos os vendedores (Admin/Gerente).</summary>
    [HttpGet]
    public async Task<ActionResult<PerformanceOverviewDto>> Get(CancellationToken cancellationToken)
        => Ok(await _performanceService.GetOverviewAsync(cancellationToken));

    /// <summary>Desempenho + meta do próprio usuário (qualquer perfil).</summary>
    [HttpGet("me")]
    public async Task<ActionResult<SellerPerformanceDto>> Me(CancellationToken cancellationToken)
        => Ok(await _performanceService.GetMyPerformanceAsync(cancellationToken));

    /// <summary>Define/edita a meta de um vendedor (Admin).</summary>
    [HttpPut("metas/{userId:long}")]
    public async Task<ActionResult<SellerPerformanceDto>> SetGoal(long userId, [FromBody] SetSalesGoalRequest request, CancellationToken cancellationToken)
        => Ok(await _performanceService.SetGoalAsync(userId, request, cancellationToken));
}
