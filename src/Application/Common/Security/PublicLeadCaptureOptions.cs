namespace AtlasCRM.Application.Common.Security;

public sealed class PublicLeadCaptureOptions
{
    public const string SectionName = "PublicLeadCapture";

    public bool Enabled { get; set; } = true;
    public string ApiKey { get; set; } = string.Empty;
    public long CompanyId { get; set; } = 1;
    public string DefaultSource { get; set; } = "Landing Page";
    public string[] CorsOrigins { get; set; } = [];
}
