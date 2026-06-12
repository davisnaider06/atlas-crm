using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Leads;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class LeadService : ILeadService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IEventLogService _eventLogService;

    public LeadService(IApplicationDbContext dbContext, ICurrentUserService currentUser, IEventLogService eventLogService)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _eventLogService = eventLogService;
    }

    public async Task<PagedResult<LeadDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        string? source = null,
        string? status = null,
        long? ownerUserId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Leads.AsNoTracking().OrderByDescending(x => x.CreatedAtUtc).AsQueryable();

        if (_currentUser.User?.Role == UserRole.Sales)
        {
            query = query.Where(x => x.OwnerUserId == _currentUser.User.UserId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim().ToLowerInvariant();
            query = query.Where(x =>
                x.Name.ToLower().Contains(normalized) ||
                (x.Email != null && x.Email.ToLower().Contains(normalized)) ||
                (x.Phone != null && x.Phone.Contains(normalized)));
        }

        if (!string.IsNullOrWhiteSpace(source))
        {
            var normalizedSource = source.Trim().ToLowerInvariant();
            query = query.Where(x => x.Source.ToLower() == normalizedSource);
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<LeadStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(x => x.Status == parsedStatus);
        }

        if (ownerUserId.HasValue)
        {
            query = query.Where(x => x.OwnerUserId == ownerUserId.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new LeadDto
            {
                Id = x.Id,
                Name = x.Name,
                Email = x.Email,
                Phone = x.Phone,
                Source = x.Source,
                Status = x.Status,
                QualificationTemperature = x.QualificationTemperature,
                QualificationScore = x.QualificationScore,
                QualificationNotes = x.QualificationNotes,
                OwnerUserId = x.OwnerUserId,
                OwnerName = x.OwnerUser != null ? x.OwnerUser.Name : null,
                ExtraDataJson = x.ExtraDataJson,
                CreatedAtUtc = x.CreatedAtUtc,
                FunnelStage = x.FunnelStage,
                Outcome = x.Outcome,
                Channel = x.Channel,
                CompanyName = x.CompanyName,
                ContactHandle = x.ContactHandle,
                LastContactAtUtc = x.LastContactAtUtc,
                NextFollowUpAtUtc = x.NextFollowUpAtUtc,
                Observations = x.Observations,
                ProposalValue = x.ProposalValue,
                ContractValue = x.ContractValue,
                LossReason = x.LossReason,
                IsCold = x.IsCold,
                FollowUpStep = x.FollowUpStep
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<LeadDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    public async Task<IReadOnlyList<LeadOwnerDto>> GetOwnersAsync(CancellationToken cancellationToken = default)
    {
        var owners = await _dbContext.Users
            .AsNoTracking()
            .Where(x => x.IsActive && (x.Role == UserRole.Sales || x.Role == UserRole.Manager || x.Role == UserRole.Admin))
            .OrderBy(x => x.Name)
            .Select(x => new LeadOwnerDto
            {
                Id = x.Id,
                Name = x.Name,
                Email = x.Email,
                Role = x.Role.ToString(),
                LeadCount = _dbContext.Leads.Count(lead => lead.OwnerUserId == x.Id)
            })
            .ToListAsync(cancellationToken);

        return owners;
    }

    public async Task<LeadDto> CreateAsync(CreateLeadRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuário não autenticado.", 401);
        var lead = new Lead
        {
            CompanyId = user.CompanyId,
            Name = request.Name.Trim(),
            Email = request.Email?.Trim(),
            Phone = request.Phone?.Trim(),
            Source = request.Source.Trim(),
            Status = request.Status,
            QualificationTemperature = request.QualificationTemperature,
            QualificationScore = Math.Clamp(request.QualificationScore, 0, 100),
            QualificationNotes = request.QualificationNotes?.Trim(),
            ExtraDataJson = request.ExtraDataJson,
            OwnerUserId = request.OwnerUserId ?? user.UserId,
            Channel = request.Channel?.Trim(),
            CompanyName = request.CompanyName?.Trim(),
            ContactHandle = request.ContactHandle?.Trim(),
            NextFollowUpAtUtc = request.NextFollowUpAtUtc,
            Observations = request.Observations?.Trim()
            // FunnelStage = Mapped (default da entidade) — todo lead entra na etapa 1.
        };

        _dbContext.Leads.Add(lead);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await ApplyLeadCreatedAutomationsAsync(lead, cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.LeadCreated,
            new { lead.Id, lead.Name, lead.Status },
            cancellationToken: cancellationToken);

        return ToDto(lead);
    }

    public async Task<LeadDto> UpdateAsync(long id, UpdateLeadRequest request, CancellationToken cancellationToken = default)
    {
        var lead = await _dbContext.Leads.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Lead não encontrado.", 404);

        lead.Name = request.Name.Trim();
        lead.Email = request.Email?.Trim();
        lead.Phone = request.Phone?.Trim();
        lead.Source = request.Source.Trim();
        lead.Status = request.Status;
        lead.QualificationTemperature = request.QualificationTemperature;
        lead.QualificationScore = Math.Clamp(request.QualificationScore, 0, 100);
        lead.QualificationNotes = request.QualificationNotes?.Trim();
        lead.ExtraDataJson = request.ExtraDataJson ?? lead.ExtraDataJson;
        lead.OwnerUserId = request.OwnerUserId;
        // Campos descritivos do processo comercial (a etapa/desfecho NÃO mudam aqui).
        lead.Channel = request.Channel?.Trim();
        lead.CompanyName = request.CompanyName?.Trim();
        lead.ContactHandle = request.ContactHandle?.Trim();
        lead.LastContactAtUtc = request.LastContactAtUtc;
        lead.NextFollowUpAtUtc = request.NextFollowUpAtUtc;
        lead.Observations = request.Observations?.Trim();
        lead.ProposalValue = request.ProposalValue;
        lead.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.LeadUpdated,
            new { lead.Id, lead.Status },
            cancellationToken: cancellationToken);

        return ToDto(lead);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var lead = await _dbContext.Leads.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Lead não encontrado.", 404);

        var hasDeals = await _dbContext.Deals.AnyAsync(x => x.LeadId == id, cancellationToken);
        if (hasDeals)
        {
            throw new AppException("Não é possível excluir um lead com negócios vinculados.", 409);
        }

        _dbContext.Leads.Remove(lead);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.LeadDeleted,
            new { lead.Id, lead.Name },
            cancellationToken: cancellationToken);
    }

    public async Task<LeadDto> MoveStageAsync(long id, MoveLeadStageRequest request, CancellationToken cancellationToken = default)
    {
        var lead = await _dbContext.Leads.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Lead não encontrado.", 404);

        var previousStage = lead.FunnelStage;

        // Validações da 7ª etapa (Fechado / Perdido): desfecho obrigatório.
        if (request.FunnelStage == FunnelStage.Closed)
        {
            if (request.Outcome == FunnelOutcome.None)
            {
                throw new AppException("Defina o desfecho do lead: Fechado ou Perdido.", 400);
            }

            if (request.Outcome == FunnelOutcome.Won && (!request.ContractValue.HasValue || request.ContractValue.Value <= 0))
            {
                throw new AppException("Informe o valor do contrato para marcar o lead como Fechado.", 400);
            }

            if (request.Outcome == FunnelOutcome.Lost && request.LossReason == LossReason.None)
            {
                throw new AppException("Selecione o motivo da perda para marcar o lead como Perdido.", 400);
            }
        }

        lead.FunnelStage = request.FunnelStage;

        if (request.FunnelStage == FunnelStage.Closed)
        {
            lead.Outcome = request.Outcome;
            if (request.Outcome == FunnelOutcome.Won)
            {
                lead.ContractValue = request.ContractValue;
                lead.LossReason = LossReason.None;
                lead.IsCold = false;
                lead.NextFollowUpAtUtc = null;
                lead.Status = LeadStatus.Converted; // mantém compatibilidade com o status legado
            }
            else // Lost
            {
                lead.LossReason = request.LossReason;
                lead.NextFollowUpAtUtc = null;
                lead.Status = LeadStatus.Lost;
            }
        }
        else
        {
            // Saiu (ou nunca esteve) da etapa final: zera desfecho.
            lead.Outcome = FunnelOutcome.None;
        }

        // Agendamento automático de follow-up + status "Frio" é aplicado aqui (passo 5).
        ApplyFollowUpScheduling(lead, previousStage);

        lead.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Receita automática no fechamento — idempotente por lead.
        if (request.FunnelStage == FunnelStage.Closed && request.Outcome == FunnelOutcome.Won)
        {
            var alreadyBilled = await _dbContext.FinanceEntries.AnyAsync(x => x.SourceLeadId == lead.Id, cancellationToken);
            if (!alreadyBilled)
            {
                _dbContext.FinanceEntries.Add(new FinanceEntry
                {
                    CompanyId = lead.CompanyId,
                    OccurredAtUtc = DateTime.UtcNow,
                    Type = "income",
                    Category = "Contrato fechado",
                    Amount = request.ContractValue!.Value,
                    Currency = "BRL",
                    Notes = $"Receita do lead #{lead.Id} - {lead.Name}",
                    SourceLeadId = lead.Id
                });
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        await _eventLogService.LogAsync(
            EventLogType.LeadStageChanged,
            new
            {
                lead.Id,
                From = previousStage.ToString(),
                To = lead.FunnelStage.ToString(),
                Outcome = lead.Outcome.ToString()
            },
            cancellationToken: cancellationToken);

        return ToDto(lead);
    }

    // Cadências de follow-up automático (dias a partir da mudança de etapa).
    private static readonly int[] ProspectedFollowUpDays = { 2, 5, 10 }; // D+2, D+5, D+10 -> Frio
    private static readonly int[] ProposalFollowUpDays = { 1, 3, 7 };    // D+1, D+3, D+7

    /// <summary>
    /// Ao mudar de etapa, registra o contato e preenche a 1ª data de follow-up
    /// da cadência da etapa de destino (editável depois). Sem cadência definida,
    /// a data atual é preservada.
    /// </summary>
    private static void ApplyFollowUpScheduling(Lead lead, FunnelStage previousStage)
    {
        if (lead.FunnelStage == previousStage || lead.FunnelStage == FunnelStage.Closed)
        {
            return;
        }

        var now = DateTime.UtcNow;
        lead.LastContactAtUtc = now;

        switch (lead.FunnelStage)
        {
            case FunnelStage.Prospected:
                lead.FollowUpStep = 1;
                lead.IsCold = false;
                lead.NextFollowUpAtUtc = now.AddDays(ProspectedFollowUpDays[0]);
                break;
            case FunnelStage.ProposalSent:
                lead.FollowUpStep = 1;
                lead.NextFollowUpAtUtc = now.AddDays(ProposalFollowUpDays[0]);
                break;
            default:
                lead.FollowUpStep = 0;
                break;
        }
    }

    /// <summary>
    /// Registra um follow-up feito e avança a cadência da etapa atual.
    /// Prospectado: D+2 -> D+5 -> D+10 -> "Frio". Proposta enviada: D+1 -> D+3 -> D+7.
    /// </summary>
    public async Task<LeadDto> AdvanceFollowUpAsync(long id, CancellationToken cancellationToken = default)
    {
        var lead = await _dbContext.Leads.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Lead não encontrado.", 404);

        var now = DateTime.UtcNow;
        lead.LastContactAtUtc = now;

        switch (lead.FunnelStage)
        {
            case FunnelStage.Prospected:
                if (lead.FollowUpStep < ProspectedFollowUpDays.Length)
                {
                    lead.FollowUpStep++;
                    lead.NextFollowUpAtUtc = now.AddDays(ProspectedFollowUpDays[lead.FollowUpStep - 1]);
                }
                else
                {
                    // Esgotou D+10 sem resposta -> Frio (não exclui, não muda de etapa).
                    lead.IsCold = true;
                    lead.NextFollowUpAtUtc = null;
                }
                break;
            case FunnelStage.ProposalSent:
                if (lead.FollowUpStep < ProposalFollowUpDays.Length)
                {
                    lead.FollowUpStep++;
                    lead.NextFollowUpAtUtc = now.AddDays(ProposalFollowUpDays[lead.FollowUpStep - 1]);
                }
                else
                {
                    lead.NextFollowUpAtUtc = null;
                }
                break;
            default:
                // Etapas sem cadência definida: apenas conclui o follow-up atual.
                lead.NextFollowUpAtUtc = null;
                break;
        }

        lead.UpdatedAtUtc = now;
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _eventLogService.LogAsync(
            EventLogType.LeadUpdated,
            new { lead.Id, FollowUpStep = lead.FollowUpStep, lead.IsCold },
            cancellationToken: cancellationToken);

        return ToDto(lead);
    }

    private static LeadDto ToDto(Lead lead, string? ownerName = null) => new()
    {
        Id = lead.Id,
        Name = lead.Name,
        Email = lead.Email,
        Phone = lead.Phone,
        Source = lead.Source,
        Status = lead.Status,
        QualificationTemperature = lead.QualificationTemperature,
        QualificationScore = lead.QualificationScore,
        QualificationNotes = lead.QualificationNotes,
        OwnerUserId = lead.OwnerUserId,
        OwnerName = ownerName,
        ExtraDataJson = lead.ExtraDataJson,
        CreatedAtUtc = lead.CreatedAtUtc,
        FunnelStage = lead.FunnelStage,
        Outcome = lead.Outcome,
        Channel = lead.Channel,
        CompanyName = lead.CompanyName,
        ContactHandle = lead.ContactHandle,
        LastContactAtUtc = lead.LastContactAtUtc,
        NextFollowUpAtUtc = lead.NextFollowUpAtUtc,
        Observations = lead.Observations,
        ProposalValue = lead.ProposalValue,
        ContractValue = lead.ContractValue,
        LossReason = lead.LossReason,
        IsCold = lead.IsCold,
        FollowUpStep = lead.FollowUpStep
    };

    private async Task ApplyLeadCreatedAutomationsAsync(Lead lead, CancellationToken cancellationToken)
    {
        var automations = await _dbContext.Automations
            .Where(x => x.CompanyId == lead.CompanyId && x.EventType == AutomationEventType.LeadCreated && x.IsActive)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        foreach (var automation in automations)
        {
            if (!MatchesLeadCondition(automation.ConditionJson, lead))
            {
                continue;
            }

            var executed = await TryExecuteLeadAutomationAsync(automation, lead, cancellationToken);
            if (!executed)
            {
                continue;
            }

            await _eventLogService.LogAsync(
                EventLogType.AutomationExecuted,
                new { AutomationId = automation.Id, lead.Id, Trigger = "LeadCreated" },
                cancellationToken: cancellationToken);
        }
    }

    private async Task<bool> TryExecuteLeadAutomationAsync(Automation automation, Lead lead, CancellationToken cancellationToken)
    {
        using var actionDoc = JsonDocument.Parse(automation.ActionJson);
        var root = actionDoc.RootElement;

        if (root.TryGetProperty("assignOwnerUserId", out var assignOwnerElement) && assignOwnerElement.TryGetInt64(out var ownerId))
        {
            lead.OwnerUserId = ownerId;
            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        if (root.TryGetProperty("userIds", out var userIdsElement) && userIdsElement.ValueKind == JsonValueKind.Array)
        {
            var userIds = userIdsElement.EnumerateArray()
                .Where(x => x.TryGetInt64(out _))
                .Select(x => x.GetInt64())
                .ToList();

            if (userIds.Count > 0)
            {
                var leadCount = await _dbContext.Leads.CountAsync(cancellationToken);
                lead.OwnerUserId = userIds[(leadCount - 1) % userIds.Count];
                await _dbContext.SaveChangesAsync(cancellationToken);
                return true;
            }
        }

        if (root.TryGetProperty("createTask", out var createTaskElement) && createTaskElement.ValueKind == JsonValueKind.True)
        {
            var description = root.TryGetProperty("taskDescription", out var taskDescription)
                ? taskDescription.GetString() ?? $"Atender lead {lead.Name}"
                : $"Atender lead {lead.Name}";

            _dbContext.Activities.Add(new Activity
            {
                CompanyId = lead.CompanyId,
                DealId = null,
                Type = ActivityType.Task,
                Description = description,
                DueAtUtc = DateTime.UtcNow.AddHours(1),
                Status = ActivityStatus.Pending,
                AssignedUserId = lead.OwnerUserId
            });

            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        return false;
    }

    private static bool MatchesLeadCondition(string conditionJson, Lead lead)
    {
        using var conditionDoc = JsonDocument.Parse(conditionJson);
        var root = conditionDoc.RootElement;

        if (root.TryGetProperty("source", out var sourceElement))
        {
            var source = sourceElement.GetString();
            if (!string.IsNullOrWhiteSpace(source) &&
                !string.Equals(source, "any", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(source, lead.Source, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }

        if (root.TryGetProperty("status", out var statusElement))
        {
            var status = statusElement.GetString();
            if (!string.IsNullOrWhiteSpace(status) &&
                !string.Equals(status, lead.Status.ToString(), StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }

        return true;
    }
}
