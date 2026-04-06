namespace AtlasCRM.Application.Contracts.Pipelines;

public sealed class PipelineDto
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public IReadOnlyList<StageDto> Stages { get; init; } = [];
}
