using AtlasCRM.Domain.Common;

namespace AtlasCRM.Domain.Entities;

public sealed class FinanceEntry : TenantEntity
{
    public DateTime OccurredAtUtc { get; set; }
    public string Type { get; set; } = "income"; // "income" or "expense"
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "BRL";
    public string? Notes { get; set; }
    public string? AttachmentFileName { get; set; }

    public Company? Company { get; set; }
}
