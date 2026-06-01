using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Security;
using AtlasCRM.Application.Contracts.Team;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class TeamMemberService : ITeamMemberService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPasswordHasher _passwordHasher;

    public TeamMemberService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        IPasswordHasher passwordHasher)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _passwordHasher = passwordHasher;
    }

    public async Task<IReadOnlyList<TeamMemberDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var users = await _dbContext.Users
            .AsNoTracking()
            .Include(x => x.Permissions)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return users.Select(ToDto).ToList();
    }

    public async Task<TeamMemberDto> CreateAsync(CreateTeamMemberRequest request, CancellationToken cancellationToken = default)
    {
        var companyId = _currentUserService.User?.CompanyId ?? throw new AppException("Usuario nao autenticado.", 401);
        var email = request.Email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            throw new AppException("Preencha nome, email e senha.", 400);
        }

        var exists = await _dbContext.Users.AnyAsync(x => x.Email == email, cancellationToken);
        if (exists)
        {
            throw new AppException("Ja existe um membro com este email.", 409);
        }

        var user = new User
        {
            CompanyId = companyId,
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = request.Role,
            IsActive = true
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await ReplacePermissionsAsync(user, NormalizePermissions(request.Permissions), cancellationToken);

        return await GetByIdAsync(user.Id, cancellationToken);
    }

    public async Task<TeamMemberDto> UpdateAsync(long id, UpdateTeamMemberRequest request, CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService.User?.UserId ?? throw new AppException("Usuario nao autenticado.", 401);
        var user = await _dbContext.Users
            .Include(x => x.Permissions)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (user is null)
        {
            throw new AppException("Membro nao encontrado.", 404);
        }

        if (user.Id == currentUserId && (!request.IsActive || request.Role != UserRole.Admin))
        {
            throw new AppException("Voce nao pode remover seu proprio acesso administrativo.", 400);
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new AppException("Informe o nome do membro.", 400);
        }

        user.Name = request.Name.Trim();
        user.Role = request.Role;
        user.IsActive = request.IsActive;

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = _passwordHasher.Hash(request.Password);
        }

        await ReplacePermissionsAsync(user, NormalizePermissions(request.Permissions), cancellationToken);
        return await GetByIdAsync(user.Id, cancellationToken);
    }

    public Task<IReadOnlyList<PermissionCatalogItemDto>> GetPermissionCatalogAsync(CancellationToken cancellationToken = default)
    {
        var catalog = new List<PermissionCatalogItemDto>
        {
            Item(CrmPermissions.DashboardView, "Ver dashboard", "Dashboard"),
            Item(CrmPermissions.LeadsView, "Ver leads", "Leads"),
            Item(CrmPermissions.LeadsCreate, "Criar leads", "Leads"),
            Item(CrmPermissions.LeadsEdit, "Editar leads", "Leads"),
            Item(CrmPermissions.LeadsDelete, "Excluir leads", "Leads"),
            Item(CrmPermissions.CustomersView, "Ver clientes", "Clientes"),
            Item(CrmPermissions.CustomersCreate, "Criar clientes", "Clientes"),
            Item(CrmPermissions.CustomersEdit, "Editar clientes", "Clientes"),
            Item(CrmPermissions.CustomersDelete, "Excluir clientes", "Clientes"),
            Item(CrmPermissions.DealsView, "Ver pipeline", "Pipeline"),
            Item(CrmPermissions.DealsCreate, "Criar negocios", "Pipeline"),
            Item(CrmPermissions.DealsEdit, "Editar/mover negocios", "Pipeline"),
            Item(CrmPermissions.DealsDelete, "Excluir negocios", "Pipeline"),
            Item(CrmPermissions.ActivitiesView, "Ver atividades", "Atividades"),
            Item(CrmPermissions.ActivitiesCreate, "Criar atividades", "Atividades"),
            Item(CrmPermissions.ActivitiesEdit, "Editar atividades", "Atividades"),
            Item(CrmPermissions.ActivitiesDelete, "Excluir atividades", "Atividades"),
            Item(CrmPermissions.DocumentsView, "Ver documentos", "Documentos"),
            Item(CrmPermissions.DocumentsCreate, "Criar documentos", "Documentos"),
            Item(CrmPermissions.DocumentsDelete, "Excluir documentos", "Documentos"),
            Item(CrmPermissions.WhatsAppManage, "Gerenciar WhatsApp", "Integracoes"),
            Item(CrmPermissions.AutomationsManage, "Gerenciar automacoes", "Configuracoes"),
            Item(CrmPermissions.SettingsView, "Ver configuracoes", "Configuracoes"),
            Item(CrmPermissions.TeamManage, "Gerenciar equipe", "Equipe")
        };

        return Task.FromResult((IReadOnlyList<PermissionCatalogItemDto>)catalog);
    }

    private async Task ReplacePermissionsAsync(User user, IEnumerable<string> permissions, CancellationToken cancellationToken)
    {
        var normalized = permissions.ToArray();
        var existing = await _dbContext.UserPermissions
            .Where(x => x.UserId == user.Id)
            .ToListAsync(cancellationToken);

        _dbContext.UserPermissions.RemoveRange(existing);

        foreach (var permission in normalized)
        {
            _dbContext.UserPermissions.Add(new UserPermission
            {
                CompanyId = user.CompanyId,
                UserId = user.Id,
                Permission = permission
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<TeamMemberDto> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .AsNoTracking()
            .Include(x => x.Permissions)
            .FirstAsync(x => x.Id == id, cancellationToken);

        return ToDto(user);
    }

    private static IEnumerable<string> NormalizePermissions(IEnumerable<string> permissions)
    {
        var allowed = CrmPermissions.All.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return permissions
            .Where(permission => allowed.Contains(permission))
            .Select(permission => CrmPermissions.All.First(allowedPermission => allowedPermission.Equals(permission, StringComparison.OrdinalIgnoreCase)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(p => p);
    }

    private static TeamMemberDto ToDto(User user) =>
        new()
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            IsActive = user.IsActive,
            Permissions = user.Role == UserRole.Admin ? CrmPermissions.All : user.Permissions.Select(x => x.Permission).OrderBy(p => p).ToArray(),
            CreatedAtUtc = user.CreatedAtUtc
        };

    private static PermissionCatalogItemDto Item(string key, string label, string group) =>
        new()
        {
            Key = key,
            Label = label,
            Group = group
        };
}
