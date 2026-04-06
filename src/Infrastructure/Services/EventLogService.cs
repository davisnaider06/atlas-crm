using System.Text.Json;
using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Infrastructure.Services;

public sealed class EventLogService : IEventLogService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;

    public EventLogService(IApplicationDbContext dbContext, ICurrentUserService currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task LogAsync(EventLogType type, object payload, long? companyId = null, CancellationToken cancellationToken = default)
    {
        var resolvedCompanyId = companyId ?? _currentUser.User?.CompanyId;
        if (!resolvedCompanyId.HasValue)
        {
            throw new AppException("Contexto de empresa nao encontrado para registrar evento.", 500);
        }

        _dbContext.EventLogs.Add(new EventLog
        {
            CompanyId = resolvedCompanyId.Value,
            Type = type,
            DataJson = JsonSerializer.Serialize(payload),
            OccurredAtUtc = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
