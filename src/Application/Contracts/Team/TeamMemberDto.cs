using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Team;

public sealed class TeamMemberDto
{
    public required long Id { get; init; }
    public required string Name { get; init; }
    public required string Email { get; init; }
    public required UserRole Role { get; init; }
    public required bool IsActive { get; init; }
    public required string[] Permissions { get; init; }
    public required DateTime CreatedAtUtc { get; init; }
}
