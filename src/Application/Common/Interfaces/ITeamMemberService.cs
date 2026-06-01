using AtlasCRM.Application.Contracts.Team;

namespace AtlasCRM.Application.Common.Interfaces;

public interface ITeamMemberService
{
    Task<IReadOnlyList<TeamMemberDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<TeamMemberDto> CreateAsync(CreateTeamMemberRequest request, CancellationToken cancellationToken = default);
    Task<TeamMemberDto> UpdateAsync(long id, UpdateTeamMemberRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PermissionCatalogItemDto>> GetPermissionCatalogAsync(CancellationToken cancellationToken = default);
}
