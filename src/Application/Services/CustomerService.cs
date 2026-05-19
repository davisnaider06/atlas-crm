using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Customers;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class CustomerService : ICustomerService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IEventLogService _eventLogService;

    public CustomerService(IApplicationDbContext dbContext, ICurrentUserService currentUser, IEventLogService eventLogService)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _eventLogService = eventLogService;
    }

    public async Task<PagedResult<CustomerDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Customers
            .AsNoTracking()
            .Include(x => x.Lead)
            .OrderByDescending(x => x.CreatedAtUtc)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim().ToLowerInvariant();
            query = query.Where(x =>
                x.Name.ToLower().Contains(normalized) ||
                (x.Email != null && x.Email.ToLower().Contains(normalized)) ||
                (x.Phone != null && x.Phone.Contains(normalized)) ||
                (x.Lead != null && x.Lead.Name.ToLower().Contains(normalized)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new CustomerDto
            {
                Id = x.Id,
                Name = x.Name,
                Email = x.Email,
                Phone = x.Phone,
                LeadId = x.LeadId,
                LeadName = x.Lead == null ? null : x.Lead.Name,
                CreatedAtUtc = x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<CustomerDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    public async Task<CustomerDto> CreateAsync(CreateCustomerRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuario nao autenticado.", 401);
        await ValidateLeadAsync(request.LeadId, cancellationToken);

        var customer = new Customer
        {
            CompanyId = user.CompanyId,
            Name = request.Name.Trim(),
            Email = request.Email?.Trim(),
            Phone = request.Phone?.Trim(),
            LeadId = request.LeadId
        };

        _dbContext.Customers.Add(customer);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(EventLogType.CustomerCreated, new { customer.Id, customer.Name }, cancellationToken: cancellationToken);

        return await MapByIdAsync(customer.Id, cancellationToken);
    }

    public async Task<CustomerDto> ConvertLeadAsync(long leadId, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuario nao autenticado.", 401);
        var lead = await _dbContext.Leads.FirstOrDefaultAsync(x => x.Id == leadId, cancellationToken)
            ?? throw new AppException("Lead nao encontrado.", 404);

        var existingCustomer = await _dbContext.Customers.AsNoTracking()
            .FirstOrDefaultAsync(x => x.LeadId == leadId, cancellationToken);
        if (existingCustomer is not null)
        {
            return await MapByIdAsync(existingCustomer.Id, cancellationToken);
        }

        var customer = new Customer
        {
            CompanyId = user.CompanyId,
            Name = lead.Name,
            Email = lead.Email,
            Phone = lead.Phone,
            LeadId = lead.Id
        };

        lead.Status = LeadStatus.Converted;
        lead.UpdatedAtUtc = DateTime.UtcNow;

        _dbContext.Customers.Add(customer);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.LeadConverted,
            new { lead.Id, CustomerId = customer.Id, lead.Name },
            cancellationToken: cancellationToken);

        return await MapByIdAsync(customer.Id, cancellationToken);
    }

    public async Task<CustomerDto> UpdateAsync(long id, UpdateCustomerRequest request, CancellationToken cancellationToken = default)
    {
        var customer = await _dbContext.Customers.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Cliente nao encontrado.", 404);
        await ValidateLeadAsync(request.LeadId, cancellationToken);

        customer.Name = request.Name.Trim();
        customer.Email = request.Email?.Trim();
        customer.Phone = request.Phone?.Trim();
        customer.LeadId = request.LeadId;
        customer.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(EventLogType.CustomerUpdated, new { customer.Id, customer.Name }, cancellationToken: cancellationToken);

        return await MapByIdAsync(customer.Id, cancellationToken);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var customer = await _dbContext.Customers.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Cliente nao encontrado.", 404);

        _dbContext.Customers.Remove(customer);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(EventLogType.CustomerDeleted, new { customer.Id, customer.Name }, cancellationToken: cancellationToken);
    }

    private async Task ValidateLeadAsync(long? leadId, CancellationToken cancellationToken)
    {
        if (!leadId.HasValue)
        {
            return;
        }

        var exists = await _dbContext.Leads.AnyAsync(x => x.Id == leadId.Value, cancellationToken);
        if (!exists)
        {
            throw new AppException("Lead nao encontrado.", 404);
        }
    }

    private async Task<CustomerDto> MapByIdAsync(long id, CancellationToken cancellationToken)
    {
        return await _dbContext.Customers
            .AsNoTracking()
            .Include(x => x.Lead)
            .Where(x => x.Id == id)
            .Select(x => new CustomerDto
            {
                Id = x.Id,
                Name = x.Name,
                Email = x.Email,
                Phone = x.Phone,
                LeadId = x.LeadId,
                LeadName = x.Lead == null ? null : x.Lead.Name,
                CreatedAtUtc = x.CreatedAtUtc
            })
            .FirstAsync(cancellationToken);
    }
}
