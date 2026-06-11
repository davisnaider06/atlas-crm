using AtlasCRM.Application.Contracts.CustomFields;
using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Common.Interfaces;

public interface ICustomFieldService
{
    Task<IReadOnlyList<CustomFieldDefinitionDto>> ListAsync(CustomFieldTarget? target = null, CancellationToken cancellationToken = default);
    Task<CustomFieldDefinitionDto> CreateAsync(CreateCustomFieldRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
