using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Leads;

namespace AtlasCRM.Application.Common.Interfaces;

public interface ILeadService
{
    Task<PagedResult<LeadDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        string? source = null,
        string? status = null,
        long? ownerUserId = null,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LeadOwnerDto>> GetOwnersAsync(CancellationToken cancellationToken = default);
    Task<LeadDto> CreateAsync(CreateLeadRequest request, CancellationToken cancellationToken = default);
    Task<LeadDto> UpdateAsync(long id, UpdateLeadRequest request, CancellationToken cancellationToken = default);
    Task<LeadDto> MoveStageAsync(long id, MoveLeadStageRequest request, CancellationToken cancellationToken = default);
    Task<LeadDto> AdvanceFollowUpAsync(long id, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);

    /// <summary>Gera uma planilha .xlsx com todos os leads visíveis ao usuário atual.</summary>
    Task<byte[]> ExportToExcelAsync(CancellationToken cancellationToken = default);

    /// <summary>Importa leads de um arquivo CSV ou Excel (.xlsx), pulando duplicados (email/telefone).</summary>
    Task<LeadImportResultDto> ImportAsync(Stream fileStream, string fileName, CancellationToken cancellationToken = default);

    /// <summary>Apaga todos os leads da empresa (exceto os que têm negócios vinculados).</summary>
    Task<LeadClearResultDto> ClearAllAsync(CancellationToken cancellationToken = default);
}
