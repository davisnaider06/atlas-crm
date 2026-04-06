namespace AtlasCRM.Application.Common.Security;

public sealed record AuthTokens(string AccessToken, string RefreshToken, DateTime ExpiresAtUtc);
