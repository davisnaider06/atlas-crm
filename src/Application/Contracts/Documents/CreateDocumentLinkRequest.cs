namespace AtlasCRM.Application.Contracts.Documents;

public sealed class CreateDocumentLinkRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string Url { get; init; } = string.Empty;
    public string? Sector { get; init; }
    public string[]? Tags { get; init; }
    public bool IsOnboarding { get; init; }
    public string Visibility { get; init; } = "private";
}
