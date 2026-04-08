using AtlasCRM.Application.Contracts.History;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IHistoryService
{
    Task<IReadOnlyList<HistoryItemDto>> GetAsync(long? leadId, long? dealId, CancellationToken cancellationToken = default);
}
