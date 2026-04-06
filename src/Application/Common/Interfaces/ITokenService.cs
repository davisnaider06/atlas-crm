using AtlasCRM.Application.Common.Security;
using AtlasCRM.Domain.Entities;

namespace AtlasCRM.Application.Common.Interfaces;

public interface ITokenService
{
    AuthTokens CreateTokens(User user);
    string GenerateRefreshToken();
}
