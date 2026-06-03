using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Documents;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class DocumentService : IDocumentService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;

    public DocumentService(IApplicationDbContext dbContext, ICurrentUserService currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<PagedResult<DocumentDto>> GetPagedAsync(int page, int pageSize, string? search = null, string? sector = null, string? tag = null, string? visibility = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Documents.AsNoTracking().OrderByDescending(x => x.CreatedAtUtc).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim().ToLowerInvariant();
            query = query.Where(x =>
                x.Title.ToLower().Contains(normalized) ||
                (x.Description != null && x.Description.ToLower().Contains(normalized)) ||
                (x.OriginalFileName != null && x.OriginalFileName.ToLower().Contains(normalized)) ||
                (x.Url != null && x.Url.ToLower().Contains(normalized)));
        }

        if (!string.IsNullOrWhiteSpace(sector))
        {
            var s = sector.Trim().ToLowerInvariant();
            query = query.Where(x => x.Sector != null && x.Sector.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var t = tag.Trim().ToLowerInvariant();
            query = query.Where(x => x.TagsJson != null && x.TagsJson.ToLower().Contains(t));
        }

        if (!string.IsNullOrWhiteSpace(visibility))
        {
            var v = visibility.Trim().ToLowerInvariant();
            query = query.Where(x => x.Visibility != null && x.Visibility.ToLower() == v);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => Map(x))
            .ToListAsync(cancellationToken);

        return new PagedResult<DocumentDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    public async Task<DocumentDto> CreateLinkAsync(CreateDocumentLinkRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuario nao autenticado.", 401);
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Url))
        {
            throw new AppException("Informe titulo e link.", 400);
        }

        var document = new CrmDocument
        {
            CompanyId = user.CompanyId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Type = DocumentType.Link,
            Url = request.Url.Trim()
        };
        document.Sector = request.Sector?.Trim();
        document.TagsJson = request.Tags is null ? null : System.Text.Json.JsonSerializer.Serialize(request.Tags);
        document.IsOnboarding = request.IsOnboarding;
        document.Visibility = string.IsNullOrWhiteSpace(request.Visibility) ? "private" : request.Visibility.Trim();

        _dbContext.Documents.Add(document);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return Map(document);
    }

    public async Task<DocumentDto> CreateFileAsync(
        string title,
        string? description,
        string originalFileName,
        string contentType,
        long sizeBytes,
        string storedFileName,
        string? sector = null,
        string[]? tags = null,
        bool isOnboarding = false,
        string visibility = "private",
        CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuario nao autenticado.", 401);
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(originalFileName) || string.IsNullOrWhiteSpace(storedFileName))
        {
            throw new AppException("Arquivo invalido.", 400);
        }

        var document = new CrmDocument
        {
            CompanyId = user.CompanyId,
            Title = title.Trim(),
            Description = description?.Trim(),
            Type = DocumentType.File,
            StoredFileName = storedFileName,
            OriginalFileName = originalFileName,
            ContentType = contentType,
            SizeBytes = sizeBytes
        };
        document.Sector = sector?.Trim();
        document.TagsJson = tags is null ? null : System.Text.Json.JsonSerializer.Serialize(tags);
        document.IsOnboarding = isOnboarding;
        document.Visibility = string.IsNullOrWhiteSpace(visibility) ? "private" : visibility.Trim();

        _dbContext.Documents.Add(document);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return Map(document);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var document = await _dbContext.Documents.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Documento nao encontrado.", 404);

        _dbContext.Documents.Remove(document);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<DocumentDto> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var document = await _dbContext.Documents.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (document is null) throw new AppException("Documento nao encontrado.", 404);
        return Map(document);
    }

    private static DocumentDto Map(CrmDocument document)
    {
        return new DocumentDto
        {
            Id = document.Id,
            Title = document.Title,
            Description = document.Description,
            Type = document.Type,
            Url = document.Url,
            OriginalFileName = document.OriginalFileName,
            ContentType = document.ContentType,
            SizeBytes = document.SizeBytes,
            Sector = document.Sector,
            Tags = string.IsNullOrWhiteSpace(document.TagsJson) ? null : System.Text.Json.JsonSerializer.Deserialize<string[]>(document.TagsJson),
            IsOnboarding = document.IsOnboarding,
            Visibility = document.Visibility,
            CreatedAtUtc = document.CreatedAtUtc
        };
    }
}
