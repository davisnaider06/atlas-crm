using System.Text;
using System.Text.Json;
using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.CustomFields;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class CustomFieldService : ICustomFieldService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;

    public CustomFieldService(IApplicationDbContext dbContext, ICurrentUserService currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<CustomFieldDefinitionDto>> ListAsync(CustomFieldTarget? target = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.CustomFieldDefinitions.AsNoTracking().AsQueryable();
        if (target.HasValue)
        {
            query = query.Where(x => x.Target == target.Value);
        }

        var items = await query
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);

        return items.Select(ToDto).ToList();
    }

    public async Task<CustomFieldDefinitionDto> CreateAsync(CreateCustomFieldRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuário não autenticado.", 401);
        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new AppException("Informe o nome do campo.", 400);
        }

        var options = request.Options
            .Select(option => option.Trim())
            .Where(option => option.Length > 0)
            .Distinct()
            .ToArray();

        if (request.Type == CustomFieldType.Select && options.Length == 0)
        {
            throw new AppException("Campos de seleção precisam de ao menos uma opção.", 400);
        }

        var fieldKey = Slugify(name);
        var keyExists = await _dbContext.CustomFieldDefinitions
            .AnyAsync(x => x.Target == request.Target && x.FieldKey == fieldKey, cancellationToken);
        if (keyExists)
        {
            throw new AppException("Já existe um campo com este nome.", 409);
        }

        var maxOrder = await _dbContext.CustomFieldDefinitions
            .Where(x => x.Target == request.Target)
            .Select(x => (int?)x.SortOrder)
            .MaxAsync(cancellationToken) ?? 0;

        var definition = new CustomFieldDefinition
        {
            CompanyId = user.CompanyId,
            Target = request.Target,
            Name = name,
            FieldKey = fieldKey,
            Type = request.Type,
            OptionsJson = options.Length > 0 ? JsonSerializer.Serialize(options) : null,
            SortOrder = maxOrder + 1
        };

        _dbContext.CustomFieldDefinitions.Add(definition);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(definition);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var definition = await _dbContext.CustomFieldDefinitions
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Campo personalizado não encontrado.", 404);

        _dbContext.CustomFieldDefinitions.Remove(definition);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static CustomFieldDefinitionDto ToDto(CustomFieldDefinition definition) => new()
    {
        Id = definition.Id,
        Target = definition.Target,
        Name = definition.Name,
        FieldKey = definition.FieldKey,
        Type = definition.Type,
        Options = string.IsNullOrWhiteSpace(definition.OptionsJson)
            ? []
            : JsonSerializer.Deserialize<string[]>(definition.OptionsJson) ?? [],
        SortOrder = definition.SortOrder
    };

    private static string Slugify(string value)
    {
        var normalized = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            if (char.IsLetterOrDigit(ch) && ch < 128)
            {
                builder.Append(ch);
            }
            else if (ch is ' ' or '-' or '_')
            {
                builder.Append('_');
            }
            // demais caracteres (acentos decompostos etc.) são descartados
        }

        var slug = builder.ToString().Trim('_');
        return string.IsNullOrEmpty(slug) ? $"campo_{Guid.NewGuid():N}"[..16] : slug;
    }
}
