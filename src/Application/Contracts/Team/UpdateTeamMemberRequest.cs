using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Team;

public sealed class UpdateTeamMemberRequest
{
    public string Name { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Sales;
    public bool IsActive { get; set; } = true;
    public string[] Permissions { get; set; } = Array.Empty<string>();
    public string? Password { get; set; }
}
