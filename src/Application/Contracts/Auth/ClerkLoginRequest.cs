namespace AtlasCRM.Application.Contracts.Auth;

public sealed class ClerkLoginRequest
{
    /// <summary>Session token (JWT) emitido pelo Clerk no frontend.</summary>
    public string Token { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
}
