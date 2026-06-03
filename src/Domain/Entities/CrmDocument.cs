using AtlasCRM.Domain.Common;
using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Domain.Entities;

public sealed class CrmDocument : TenantEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DocumentType Type { get; set; } = DocumentType.File;
    public string? Url { get; set; }
    public string? StoredFileName { get; set; }
    public string? OriginalFileName { get; set; }
    public string? ContentType { get; set; }
    public long? SizeBytes { get; set; }
    // Novos campos para transformar documentos em Materiais
    public string? Sector { get; set; }
    public string? TagsJson { get; set; }
    public bool IsOnboarding { get; set; }
    public string Visibility { get; set; } = "private";

    public Company? Company { get; set; }
}
