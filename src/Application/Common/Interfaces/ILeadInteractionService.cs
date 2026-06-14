using AtlasCRM.Application.Contracts.Leads;

namespace AtlasCRM.Application.Common.Interfaces;

public interface ILeadInteractionService
{
    Task<IReadOnlyList<LeadInteractionDto>> GetByLeadAsync(long leadId, CancellationToken cancellationToken = default);
    Task<LeadInteractionDto> CreateAsync(long leadId, CreateLeadInteractionRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
