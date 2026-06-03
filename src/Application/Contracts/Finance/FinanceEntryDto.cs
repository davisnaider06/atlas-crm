namespace AtlasCRM.Application.Contracts.Finance;

public sealed class FinanceEntryDto
{
    public long Id { get; init; }
    public DateTime OccurredAtUtc { get; init; }
    public string Type { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public string Currency { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public string? AttachmentFileName { get; init; }
    public DateTime CreatedAtUtc { get; init; }
}
