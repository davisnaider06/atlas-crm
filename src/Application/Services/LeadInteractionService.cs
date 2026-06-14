using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.Leads;
using AtlasCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class LeadInteractionService : ILeadInteractionService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;

    public LeadInteractionService(IApplicationDbContext dbContext, ICurrentUserService currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<LeadInteractionDto>> GetByLeadAsync(long leadId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.LeadInteractions
            .AsNoTracking()
            .Where(x => x.LeadId == leadId)
            .OrderByDescending(x => x.OccurredAtUtc)
            .Select(x => new LeadInteractionDto
            {
                Id = x.Id,
                LeadId = x.LeadId,
                Channel = x.Channel,
                ScriptId = x.ScriptId,
                ScriptName = x.ScriptName,
                Outcome = x.Outcome,
                Notes = x.Notes,
                OccurredAtUtc = x.OccurredAtUtc,
                CreatedByUserId = x.CreatedByUserId,
                CreatedByName = x.CreatedByUser != null ? x.CreatedByUser.Name : null
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<LeadInteractionDto> CreateAsync(long leadId, CreateLeadInteractionRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuário não autenticado.", 401);

        var lead = await _dbContext.Leads.FirstOrDefaultAsync(x => x.Id == leadId, cancellationToken)
            ?? throw new AppException("Lead não encontrado.", 404);

        if (string.IsNullOrWhiteSpace(request.Channel))
        {
            throw new AppException("Informe o canal do contato.", 400);
        }

        string? scriptName = null;
        if (request.ScriptId.HasValue)
        {
            var script = await _dbContext.Scripts
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == request.ScriptId.Value, cancellationToken)
                ?? throw new AppException("Script não encontrado.", 404);
            scriptName = script.Name;
        }

        var occurredAt = request.OccurredAtUtc ?? DateTime.UtcNow;
        var interaction = new LeadInteraction
        {
            CompanyId = lead.CompanyId,
            LeadId = leadId,
            Channel = request.Channel.Trim(),
            ScriptId = request.ScriptId,
            ScriptName = scriptName,
            Outcome = request.Outcome,
            Notes = request.Notes?.Trim(),
            OccurredAtUtc = occurredAt,
            CreatedByUserId = user.UserId
        };

        _dbContext.LeadInteractions.Add(interaction);

        // Mantém o "último contato" do lead em dia.
        if (lead.LastContactAtUtc == null || occurredAt > lead.LastContactAtUtc)
        {
            lead.LastContactAtUtc = occurredAt;
            lead.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new LeadInteractionDto
        {
            Id = interaction.Id,
            LeadId = interaction.LeadId,
            Channel = interaction.Channel,
            ScriptId = interaction.ScriptId,
            ScriptName = interaction.ScriptName,
            Outcome = interaction.Outcome,
            Notes = interaction.Notes,
            OccurredAtUtc = interaction.OccurredAtUtc,
            CreatedByUserId = interaction.CreatedByUserId,
            CreatedByName = null
        };
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var interaction = await _dbContext.LeadInteractions.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Registro de contato não encontrado.", 404);

        _dbContext.LeadInteractions.Remove(interaction);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
