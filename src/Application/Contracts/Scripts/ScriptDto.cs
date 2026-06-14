namespace AtlasCRM.Application.Contracts.Scripts;

public sealed class ScriptDto
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Channel { get; init; }
    public string? Body { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    /// <summary>Quantidade de contatos registrados com este script.</summary>
    public int UsageCount { get; init; }
    /// <summary>Taxa de resposta (respostas / usos) — métrica para otimizar abordagens.</summary>
    public double ReplyRate { get; init; }
}
