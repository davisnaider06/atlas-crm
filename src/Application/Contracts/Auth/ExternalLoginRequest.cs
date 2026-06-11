namespace AtlasCRM.Application.Contracts.Auth;

/// <summary>Identidade já validada por um provedor externo (ex.: Clerk).</summary>
public sealed class ExternalLoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
}
