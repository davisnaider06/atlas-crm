using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Security;
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
            .Include(x => x.Permissions)
            .FirstOrDefaultAsync(x => x.Email == email && x.IsActive, cancellationToken);

        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new AppException("Credenciais inválidas.", 401);
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
            Role = user.Role,
            Permissions = GetEffectivePermissions(user)
        };
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(request.CompanyName) ||
            string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            throw new AppException("Preencha empresa, nome, email e senha.", 400);
        }

        var emailExists = await _dbContext.Users.IgnoreQueryFilters().AnyAsync(x => x.Email == email, cancellationToken);
        if (emailExists)
        {
            throw new AppException("Já existe um usuário com este email.", 409);
        }

        var company = new Company
        {
            Name = request.CompanyName.Trim(),
            Plan = PlanType.Growth
        };

        _dbContext.Companies.Add(company);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var user = new User
        {
            CompanyId = company.Id,
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = UserRole.Admin,
            IsActive = true
        };

        var pipeline = new Pipeline
        {
            CompanyId = company.Id,
            Name = "Pipeline Principal"
        };

        _dbContext.Users.Add(user);
        _dbContext.Pipelines.Add(pipeline);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _dbContext.Stages.AddRange(
            new Stage { PipelineId = pipeline.Id, Name = "Entrada", Order = 1 },
            new Stage { PipelineId = pipeline.Id, Name = "Proposta", Order = 2 },
            new Stage { PipelineId = pipeline.Id, Name = "Fechado", Order = 3 });

        await _dbContext.SaveChangesAsync(cancellationToken);

        var tokens = _tokenService.CreateTokens(user);
        _dbContext.RefreshTokens.Add(new RefreshToken
        {
            CompanyId = user.CompanyId,
            UserId = user.Id,
            Token = tokens.RefreshToken,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(14)
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(EventLogType.AuthLogin, new { user.Id, user.CompanyId, Registered = true }, user.CompanyId, cancellationToken);

        return new AuthResponse
        {
            AccessToken = tokens.AccessToken,
            RefreshToken = tokens.RefreshToken,
            ExpiresAtUtc = tokens.ExpiresAtUtc,
            UserId = user.Id,
            CompanyId = user.CompanyId,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            Permissions = GetEffectivePermissions(user)
        };
    }

    public async Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        var refresh = await _dbContext.RefreshTokens
            .Include(x => x.User)
                .ThenInclude(x => x!.Permissions)
            .FirstOrDefaultAsync(x => x.Token == request.RefreshToken && !x.IsRevoked, cancellationToken);

        if (refresh?.User is null || refresh.ExpiresAtUtc <= DateTime.UtcNow)
        {
            throw new AppException("Refresh token inválido.", 401);
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
            Role = refresh.User.Role,
            Permissions = GetEffectivePermissions(refresh.User)
        };
    }

    private static string[] GetEffectivePermissions(User user)
    {
        if (user.Role == UserRole.Admin)
        {
            return CrmPermissions.All;
        }

        return user.Permissions.Select(x => x.Permission).Order().ToArray();
    }
}
