namespace AtlasCRM.Application.Contracts.Leads;

public sealed class LeadOwnerDto
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public int LeadCount { get; init; }
}
