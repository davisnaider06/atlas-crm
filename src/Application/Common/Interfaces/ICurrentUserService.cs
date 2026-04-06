using AtlasCRM.Application.Common.Security;

namespace AtlasCRM.Application.Common.Interfaces;

public interface ICurrentUserService
{
    bool IsAuthenticated { get; }
    CurrentUser? User { get; }
}
