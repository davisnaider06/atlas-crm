namespace AtlasCRM.Application.Contracts.Scripts;

public sealed class SaveScriptRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Channel { get; set; }
    public string? Body { get; set; }
    public bool IsActive { get; set; } = true;
}
