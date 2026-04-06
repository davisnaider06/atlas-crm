using AtlasCRM.Domain.Common;

namespace AtlasCRM.Domain.Entities;

public sealed class RefreshToken : TenantEntity
{
    public long UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public bool IsRevoked { get; set; }

    public User? User { get; set; }
}
