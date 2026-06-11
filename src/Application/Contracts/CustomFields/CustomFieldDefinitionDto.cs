using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.CustomFields;

public sealed class CustomFieldDefinitionDto
{
    public long Id { get; init; }
    public CustomFieldTarget Target { get; init; }
    public string Name { get; init; } = string.Empty;
    public string FieldKey { get; init; } = string.Empty;
    public CustomFieldType Type { get; init; }
    public string[] Options { get; init; } = [];
    public int SortOrder { get; init; }
}
