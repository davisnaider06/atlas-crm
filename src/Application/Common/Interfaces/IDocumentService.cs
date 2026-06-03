using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Documents;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IDocumentService
{
    Task<PagedResult<DocumentDto>> GetPagedAsync(int page, int pageSize, string? search = null, string? sector = null, string? tag = null, string? visibility = null, CancellationToken cancellationToken = default);
    Task<DocumentDto> CreateLinkAsync(CreateDocumentLinkRequest request, CancellationToken cancellationToken = default);
    Task<DocumentDto> CreateFileAsync(string title, string? description, string originalFileName, string contentType, long sizeBytes, string storedFileName, string? sector = null, string[]? tags = null, bool isOnboarding = false, string visibility = "private", CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<DocumentDto> GetByIdAsync(long id, CancellationToken cancellationToken = default);
}
