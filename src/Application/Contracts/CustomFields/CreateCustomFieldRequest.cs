using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Contracts.CustomFields;

public sealed class CreateCustomFieldRequest
{
    public CustomFieldTarget Target { get; set; } = CustomFieldTarget.Lead;
    public string Name { get; set; } = string.Empty;
    public CustomFieldType Type { get; set; } = CustomFieldType.Text;
    public string[] Options { get; set; } = [];
}
