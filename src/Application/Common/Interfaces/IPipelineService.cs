using AtlasCRM.Application.Contracts.Pipelines;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IPipelineService
{
    Task<IReadOnlyList<PipelineDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PipelineDto> CreateAsync(CreatePipelineRequest request, CancellationToken cancellationToken = default);
}
