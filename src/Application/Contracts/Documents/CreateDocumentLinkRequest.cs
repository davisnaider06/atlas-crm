namespace AtlasCRM.Application.Contracts.Documents;

public sealed class CreateDocumentLinkRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string Url { get; init; } = string.Empty;
}
