namespace AtlasCRM.Application.Contracts.Leads;

public sealed class PublicLeadCaptureRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Source { get; set; }
    public string? CompanyName { get; set; }
    public string? Role { get; set; }
    public string? MonthlyRevenue { get; set; }
    public string? Budget { get; set; }
    public string? Urgency { get; set; }
    public string? Interest { get; set; }
    public string? Notes { get; set; }
    public Dictionary<string, string>? Metadata { get; set; }
}
