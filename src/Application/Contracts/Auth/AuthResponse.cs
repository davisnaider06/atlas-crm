using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Auth;

public sealed class AuthResponse
{
    public required string AccessToken { get; init; }
    public required string RefreshToken { get; init; }
    public required DateTime ExpiresAtUtc { get; init; }
    public required long UserId { get; init; }
    public required long CompanyId { get; init; }
    public required string Name { get; init; }
    public required string Email { get; init; }
    public required UserRole Role { get; init; }
}
