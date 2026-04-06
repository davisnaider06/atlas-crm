using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.Auth;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class AuthService : IAuthService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IEventLogService _eventLogService;

    public AuthService(
        IApplicationDbContext dbContext,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IEventLogService eventLogService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _eventLogService = eventLogService;
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Email == email && x.IsActive, cancellationToken);

        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new AppException("Credenciais invalidas.", 401);
        }

        var tokens = _tokenService.CreateTokens(user);

        _dbContext.RefreshTokens.Add(new RefreshToken
        {
            CompanyId = user.CompanyId,
            UserId = user.Id,
            Token = tokens.RefreshToken,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(14)
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(EventLogType.AuthLogin, new { user.Id, user.CompanyId }, user.CompanyId, cancellationToken);

        return new AuthResponse
        {
            AccessToken = tokens.AccessToken,
            RefreshToken = tokens.RefreshToken,
            ExpiresAtUtc = tokens.ExpiresAtUtc,
            UserId = user.Id,
            CompanyId = user.CompanyId,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role
        };
    }

    public async Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        var refresh = await _dbContext.RefreshTokens
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Token == request.RefreshToken && !x.IsRevoked, cancellationToken);

        if (refresh?.User is null || refresh.ExpiresAtUtc <= DateTime.UtcNow)
        {
            throw new AppException("Refresh token invalido.", 401);
        }

        refresh.IsRevoked = true;

        var tokens = _tokenService.CreateTokens(refresh.User);

        _dbContext.RefreshTokens.Add(new RefreshToken
        {
            CompanyId = refresh.CompanyId,
            UserId = refresh.UserId,
            Token = tokens.RefreshToken,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(14)
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AuthResponse
        {
            AccessToken = tokens.AccessToken,
            RefreshToken = tokens.RefreshToken,
            ExpiresAtUtc = tokens.ExpiresAtUtc,
            UserId = refresh.User.Id,
            CompanyId = refresh.User.CompanyId,
            Name = refresh.User.Name,
            Email = refresh.User.Email,
            Role = refresh.User.Role
        };
    }
}
