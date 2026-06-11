using AtlasCRM.Domain.Common;
using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Domain.Entities;

public sealed class CustomFieldDefinition : TenantEntity
{
    public CustomFieldTarget Target { get; set; } = CustomFieldTarget.Lead;
    public string Name { get; set; } = string.Empty;
    /// <summary>Chave estável usada no JSON de valores (slug do nome).</summary>
    public string FieldKey { get; set; } = string.Empty;
    public CustomFieldType Type { get; set; } = CustomFieldType.Text;
    /// <summary>Opções (JSON array de strings) quando Type = Select.</summary>
    public string? OptionsJson { get; set; }
    public int SortOrder { get; set; }

    public Company? Company { get; set; }
}
