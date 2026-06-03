using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.Documents;

public sealed class DocumentDto
{
    public long Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DocumentType Type { get; init; }
    public string? Url { get; init; }
    public string? OriginalFileName { get; init; }
    public string? ContentType { get; init; }
    public long? SizeBytes { get; init; }
    public string? Sector { get; init; }
    public string[]? Tags { get; init; }
    public bool IsOnboarding { get; init; }
    public string Visibility { get; init; } = "private";
    public DateTime CreatedAtUtc { get; init; }
}
