using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IEventLogService
{
    Task LogAsync(EventLogType type, object payload, long? companyId = null, CancellationToken cancellationToken = default);
}
