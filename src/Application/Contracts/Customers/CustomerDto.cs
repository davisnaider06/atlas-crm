namespace AtlasCRM.Application.Contracts.Customers;

public sealed class CustomerDto
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public long? LeadId { get; init; }
    public string? LeadName { get; init; }
    public DateTime CreatedAtUtc { get; init; }
}
