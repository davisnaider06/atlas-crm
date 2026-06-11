namespace AtlasCRM.Application.Common.Security;

public sealed class ClerkOptions
{
    public const string SectionName = "Clerk";

    /// <summary>Issuer do Clerk, ex.: https://xxxxx.clerk.accounts.dev (Frontend API URL).</summary>
    public string Authority { get; set; } = string.Empty;

    /// <summary>Secret key (sk_...) usada para buscar dados do usuário na Backend API do Clerk.</summary>
    public string SecretKey { get; set; } = string.Empty;

    public bool Enabled => !string.IsNullOrWhiteSpace(Authority);
}
