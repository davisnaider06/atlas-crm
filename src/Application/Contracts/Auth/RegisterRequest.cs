namespace AtlasCRM.Application.Contracts.Auth;

public sealed class RegisterRequest
{
    public string CompanyName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
