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

    /// <summary>
    /// Importa leads de um arquivo CSV ou Excel (.xlsx). Email duplicado é sempre pulado.
    /// <paramref name="phoneDuplicateMode"/>: "ask" (não grava e pede confirmação se houver telefone repetido),
    /// "import" (cria mesmo repetido) ou "skip" (pula os de telefone repetido).
    /// Quando <paramref name="distribute"/> é true, divide os leads criados entre os vendedores
    /// (equilibrando a carga); <paramref name="ownerUserIds"/> restringe quais vendedores participam.
    /// </summary>
    Task<LeadImportResultDto> ImportAsync(
        Stream fileStream,
        string fileName,
        bool distribute,
        IReadOnlyList<long>? ownerUserIds,
        string phoneDuplicateMode,
        CancellationToken cancellationToken = default);

    /// <summary>Apaga todos os leads da empresa (exceto os que têm negócios vinculados).</summary>
    Task<LeadClearResultDto> ClearAllAsync(CancellationToken cancellationToken = default);
}
