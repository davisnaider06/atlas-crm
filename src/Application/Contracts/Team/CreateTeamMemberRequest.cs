using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Team;

public sealed class CreateTeamMemberRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Sales;
    public string[] Permissions { get; set; } = Array.Empty<string>();
}
