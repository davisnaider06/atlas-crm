namespace AtlasCRM.Application.Contracts.Pipelines;

public sealed class CreatePipelineRequest
{
    public string Name { get; set; } = string.Empty;
    public List<CreateStageRequest> Stages { get; set; } = [];
}
