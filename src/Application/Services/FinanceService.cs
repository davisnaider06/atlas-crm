using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Finance;
using AtlasCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class FinanceService : IFinanceService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;

    public FinanceService(IApplicationDbContext dbContext, ICurrentUserService currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<PagedResult<FinanceEntryDto>> GetPagedAsync(int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.FinanceEntries.AsNoTracking().OrderByDescending(x => x.OccurredAtUtc).AsQueryable();

        var total = await query.CountAsync(cancellationToken);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new FinanceEntryDto
            {
                Id = x.Id,
                OccurredAtUtc = x.OccurredAtUtc,
                Type = x.Type,
                Category = x.Category,
                Amount = x.Amount,
                Currency = x.Currency,
                Notes = x.Notes,
                AttachmentFileName = x.AttachmentFileName,
                CreatedAtUtc = x.CreatedAtUtc
            }).ToListAsync(cancellationToken);

        return new PagedResult<FinanceEntryDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = total };
    }

    public async Task<FinanceEntryDto> CreateAsync(CreateFinanceEntryRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuário não autenticado.", 401);

        var entry = new FinanceEntry
        {
            CompanyId = user.CompanyId,
            OccurredAtUtc = request.OccurredAtUtc,
            Type = request.Type,
            Category = request.Category.Trim(),
            Amount = request.Amount,
            Currency = request.Currency,
            Notes = request.Notes
        };

        _dbContext.FinanceEntries.Add(entry);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new FinanceEntryDto
        {
            Id = entry.Id,
            OccurredAtUtc = entry.OccurredAtUtc,
            Type = entry.Type,
            Category = entry.Category,
            Amount = entry.Amount,
            Currency = entry.Currency,
            Notes = entry.Notes,
            AttachmentFileName = entry.AttachmentFileName,
            CreatedAtUtc = entry.CreatedAtUtc
        };
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entry = await _dbContext.FinanceEntries.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Lançamento não encontrado.", 404);

        _dbContext.FinanceEntries.Remove(entry);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
