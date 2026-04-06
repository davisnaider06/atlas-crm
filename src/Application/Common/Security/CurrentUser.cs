using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Application.Common.Security;

public sealed record CurrentUser(long UserId, long CompanyId, UserRole Role, string Email);
