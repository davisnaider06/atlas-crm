namespace AtlasCRM.Application.Contracts.History;

public sealed class HistoryItemDto
{
    public long Id { get; init; }
    public string Type { get; init; } = string.Empty;
    public string DataJson { get; init; } = "{}";
    public DateTime OccurredAtUtc { get; init; }
}
