using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.Pipelines;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize]
[Route("pipelines")]
public sealed class PipelinesController : ControllerBase
{
    private readonly IPipelineService _pipelineService;

    public PipelinesController(IPipelineService pipelineService)
    {
        _pipelineService = pipelineService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PipelineDto>>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _pipelineService.GetAllAsync(cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<PipelineDto>> Post([FromBody] CreatePipelineRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _pipelineService.CreateAsync(request, cancellationToken));
    }
}
