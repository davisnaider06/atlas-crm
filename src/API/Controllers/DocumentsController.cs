using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Documents;
using AtlasCRM.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize]
[Route("documentos")]
public sealed class DocumentsController : ControllerBase
{
    private readonly IDocumentService _documentService;
    private readonly AtlasCrmDbContext _dbContext;
    private readonly IWebHostEnvironment _environment;

    public DocumentsController(IDocumentService documentService, AtlasCrmDbContext dbContext, IWebHostEnvironment environment)
    {
        _documentService = documentService;
        _dbContext = dbContext;
        _environment = environment;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<DocumentDto>>> Get(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _documentService.GetPagedAsync(page, Math.Clamp(pageSize, 1, 100), search, cancellationToken));
    }

    [HttpPost("links")]
    public async Task<ActionResult<DocumentDto>> CreateLink([FromBody] CreateDocumentLinkRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _documentService.CreateLinkAsync(request, cancellationToken));
    }

    [HttpPost("arquivos")]
    [RequestSizeLimit(25_000_000)]
    public async Task<ActionResult<DocumentDto>> UploadFile(
        [FromForm] string title,
        [FromForm] string? description,
        [FromForm] IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
        {
            return BadRequest(new { error = "Arquivo vazio." });
        }

        var uploadsPath = Path.Combine(_environment.ContentRootPath, "uploads");
        Directory.CreateDirectory(uploadsPath);

        var extension = Path.GetExtension(file.FileName);
        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var storedPath = Path.Combine(uploadsPath, storedFileName);

        await using (var stream = System.IO.File.Create(storedPath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return Ok(await _documentService.CreateFileAsync(
            title,
            description,
            file.FileName,
            file.ContentType,
            file.Length,
            storedFileName,
            cancellationToken));
    }

    [HttpGet("{id:long}/download")]
    public async Task<IActionResult> Download(long id, CancellationToken cancellationToken)
    {
        var document = await _dbContext.Documents.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (document is null || string.IsNullOrWhiteSpace(document.StoredFileName))
        {
            return NotFound(new { error = "Documento nao encontrado." });
        }

        var path = Path.Combine(_environment.ContentRootPath, "uploads", document.StoredFileName);
        if (!System.IO.File.Exists(path))
        {
            return NotFound(new { error = "Arquivo nao encontrado no servidor." });
        }

        return PhysicalFile(path, document.ContentType ?? "application/octet-stream", document.OriginalFileName);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var document = await _dbContext.Documents.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (!string.IsNullOrWhiteSpace(document?.StoredFileName))
        {
            var path = Path.Combine(_environment.ContentRootPath, "uploads", document.StoredFileName);
            if (System.IO.File.Exists(path))
            {
                System.IO.File.Delete(path);
            }
        }

        await _documentService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
