using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.Scripts;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class ScriptService : IScriptService
{
    private readonly IApplicationDbContext _dbContext;

    public ScriptService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ScriptDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var scripts = await _dbContext.Scripts
            .AsNoTracking()
            .OrderByDescending(x => x.IsActive)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        // Estatísticas de uso por script (quantos contatos e quantos geraram resposta).
        var stats = await _dbContext.LeadInteractions
            .AsNoTracking()
            .Where(x => x.ScriptId != null)
            .GroupBy(x => x.ScriptId!.Value)
            .Select(g => new
            {
                ScriptId = g.Key,
                Usage = g.Count(),
                Replies = g.Count(i => i.Outcome != InteractionOutcome.NoReply)
            })
            .ToListAsync(cancellationToken);

        var statMap = stats.ToDictionary(x => x.ScriptId);

        return scripts.Select(x =>
        {
            statMap.TryGetValue(x.Id, out var s);
            var usage = s?.Usage ?? 0;
            var replies = s?.Replies ?? 0;
            return new ScriptDto
            {
                Id = x.Id,
                Name = x.Name,
                Channel = x.Channel,
                Body = x.Body,
                IsActive = x.IsActive,
                CreatedAtUtc = x.CreatedAtUtc,
                UsageCount = usage,
                ReplyRate = usage > 0 ? (double)replies / usage : 0d
            };
        }).ToList();
    }

    public async Task<ScriptDto> CreateAsync(SaveScriptRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new AppException("Informe o nome do script.", 400);
        }

        var script = new Script
        {
            Name = request.Name.Trim(),
            Channel = request.Channel?.Trim(),
            Body = request.Body?.Trim(),
            IsActive = request.IsActive
        };

        _dbContext.Scripts.Add(script);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(script);
    }

    public async Task<ScriptDto> UpdateAsync(long id, SaveScriptRequest request, CancellationToken cancellationToken = default)
    {
        var script = await _dbContext.Scripts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Script não encontrado.", 404);

        script.Name = request.Name.Trim();
        script.Channel = request.Channel?.Trim();
        script.Body = request.Body?.Trim();
        script.IsActive = request.IsActive;
        script.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(script);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var script = await _dbContext.Scripts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Script não encontrado.", 404);

        _dbContext.Scripts.Remove(script);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static ScriptDto ToDto(Script script) => new()
    {
        Id = script.Id,
        Name = script.Name,
        Channel = script.Channel,
        Body = script.Body,
        IsActive = script.IsActive,
        CreatedAtUtc = script.CreatedAtUtc,
        UsageCount = 0,
        ReplyRate = 0d
    };
}
