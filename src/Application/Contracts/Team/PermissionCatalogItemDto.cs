namespace AtlasCRM.Application.Contracts.Team;

public sealed class PermissionCatalogItemDto
{
    public required string Key { get; init; }
    public required string Label { get; init; }
    public required string Group { get; init; }
}
