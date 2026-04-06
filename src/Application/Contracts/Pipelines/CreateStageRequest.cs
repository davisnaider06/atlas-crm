namespace AtlasCRM.Application.Contracts.Pipelines;

public sealed class CreateStageRequest
{
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }
}
