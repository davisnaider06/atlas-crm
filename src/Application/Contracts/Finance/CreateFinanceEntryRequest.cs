namespace AtlasCRM.Application.Contracts.Finance;

public sealed class CreateFinanceEntryRequest
{
    public DateTime OccurredAtUtc { get; set; }
    public string Type { get; set; } = "income";
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "BRL";
    public string? Notes { get; set; }
}
