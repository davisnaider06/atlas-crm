namespace AtlasCRM.Application.Common.Security;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "AtlasCRM";
    public string Audience { get; set; } = "AtlasCRM.Client";
    public string SecretKey { get; set; } = "atlascrm-super-secret-key-change-me";
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 14;
}
