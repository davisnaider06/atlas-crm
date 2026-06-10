using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Appointments;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class AppointmentService : IAppointmentService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;

    public AppointmentService(IApplicationDbContext dbContext, ICurrentUserService currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<PagedResult<AppointmentDto>> GetPagedAsync(
        int page,
        int pageSize,
        DateTime? from = null,
        DateTime? to = null,
        string? status = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Appointments
            .AsNoTracking()
            .Include(x => x.Lead)
            .Include(x => x.Deal)
            .Include(x => x.AssignedUser)
            .OrderBy(x => x.StartAtUtc)
            .AsQueryable();

        if (_currentUser.User?.Role == UserRole.Sales)
        {
            query = query.Where(x => x.AssignedUserId == _currentUser.User.UserId);
        }

        if (from.HasValue)
            query = query.Where(x => x.StartAtUtc >= from.Value);

        if (to.HasValue)
            query = query.Where(x => x.StartAtUtc <= to.Value);

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<AppointmentStatus>(status, true, out var parsedStatus))
            query = query.Where(x => x.Status == parsedStatus);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => ToDto(x))
            .ToListAsync(cancellationToken);

        return new PagedResult<AppointmentDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    public async Task<AppointmentDto> CreateAsync(CreateAppointmentRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuário não autenticado.", 401);

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new AppException("O título do agendamento é obrigatório.", 400);

        if (request.EndAtUtc <= request.StartAtUtc)
            throw new AppException("A data de término deve ser posterior à data de início.", 400);

        var appointment = new Appointment
        {
            CompanyId = user.CompanyId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            StartAtUtc = request.StartAtUtc,
            EndAtUtc = request.EndAtUtc,
            Type = request.Type,
            Status = AppointmentStatus.Scheduled,
            LeadId = request.LeadId,
            DealId = request.DealId,
            AssignedUserId = request.AssignedUserId ?? user.UserId
        };

        _dbContext.Appointments.Add(appointment);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(appointment.Id, cancellationToken);
    }

    public async Task<AppointmentDto> UpdateAsync(long id, UpdateAppointmentRequest request, CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Agendamento não encontrado.", 404);

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new AppException("O título do agendamento é obrigatório.", 400);

        if (request.EndAtUtc <= request.StartAtUtc)
            throw new AppException("A data de término deve ser posterior à data de início.", 400);

        appointment.Title = request.Title.Trim();
        appointment.Description = request.Description?.Trim();
        appointment.StartAtUtc = request.StartAtUtc;
        appointment.EndAtUtc = request.EndAtUtc;
        appointment.Type = request.Type;
        appointment.Status = request.Status;
        appointment.LeadId = request.LeadId;
        appointment.DealId = request.DealId;
        if (request.AssignedUserId.HasValue)
            appointment.AssignedUserId = request.AssignedUserId.Value;
        appointment.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(appointment.Id, cancellationToken);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Agendamento não encontrado.", 404);

        _dbContext.Appointments.Remove(appointment);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<AppointmentDto> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var a = await _dbContext.Appointments
            .AsNoTracking()
            .Include(x => x.Lead)
            .Include(x => x.Deal)
            .Include(x => x.AssignedUser)
            .FirstAsync(x => x.Id == id, cancellationToken);

        return ToDto(a);
    }

    private static AppointmentDto ToDto(Appointment a) => new()
    {
        Id = a.Id,
        Title = a.Title,
        Description = a.Description,
        StartAtUtc = a.StartAtUtc,
        EndAtUtc = a.EndAtUtc,
        Type = a.Type,
        Status = a.Status,
        LeadId = a.LeadId,
        LeadName = a.Lead?.Name,
        DealId = a.DealId,
        DealLeadName = a.Deal?.Lead?.Name,
        AssignedUserId = a.AssignedUserId,
        AssignedUserName = a.AssignedUser?.Name,
        CreatedAtUtc = a.CreatedAtUtc
    };
}
