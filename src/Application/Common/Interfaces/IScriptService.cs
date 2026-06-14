using AtlasCRM.Application.Contracts.Scripts;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IScriptService
{
    Task<IReadOnlyList<ScriptDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ScriptDto> CreateAsync(SaveScriptRequest request, CancellationToken cancellationToken = default);
    Task<ScriptDto> UpdateAsync(long id, SaveScriptRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
