using System.Security.Claims;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Security;
using AtlasCRM.Domain.Enums;
using Microsoft.AspNetCore.Http;

namespace AtlasCRM.Infrastructure.Security;

public sealed class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private CurrentUser? _user;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public bool IsAuthenticated => User is not null;

    public CurrentUser? User
    {
        get
        {
            if (_user is not null)
            {
                return _user;
            }

            var principal = _httpContextAccessor.HttpContext?.User;
            if (principal?.Identity?.IsAuthenticated != true)
            {
                return null;
            }

            var userId = GetLongClaim(principal, ClaimTypes.NameIdentifier);
            var companyId = GetLongClaim(principal, "company_id");
            var email = principal.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
            var roleText = principal.FindFirstValue(ClaimTypes.Role) ?? UserRole.Sales.ToString();
            Enum.TryParse<UserRole>(roleText, true, out var role);

            _user = new CurrentUser(userId, companyId, role, email);
            return _user;
        }
    }

    private static long GetLongClaim(ClaimsPrincipal principal, string claimType)
    {
        var value = principal.FindFirstValue(claimType);
        return long.TryParse(value, out var parsed) ? parsed : 0;
    }
}
