namespace AtlasCRM.Application.Contracts.Pipelines;

public sealed class StageDto
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public int Order { get; init; }
}
