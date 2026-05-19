namespace AtlasCRM.Application.Contracts.Customers;

public sealed class UpdateCustomerRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public long? LeadId { get; init; }
}
