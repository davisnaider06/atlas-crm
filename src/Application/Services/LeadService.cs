using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Leads;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using System.Globalization;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
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
        string? leadType = null,
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

        if (!string.IsNullOrWhiteSpace(leadType) && Enum.TryParse<LeadType>(leadType, true, out var parsedType))
        {
            query = query.Where(x => x.LeadType == parsedType);
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
                LeadType = x.LeadType,
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
                FollowUpStep = x.FollowUpStep,
                City = x.City,
                InstagramHandle = x.InstagramHandle,
                GoogleRating = x.GoogleRating,
                BantBudget = x.BantBudget,
                BantAuthority = x.BantAuthority,
                BantNeed = x.BantNeed,
                BantTimeline = x.BantTimeline
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<LeadDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    public async Task<IReadOnlyList<LeadOwnerDto>> GetOwnersAsync(CancellationToken cancellationToken = default)
    {
        var users = await _dbContext.Users
            .AsNoTracking()
            .Where(x => x.IsActive && (x.Role == UserRole.Sales || x.Role == UserRole.Manager || x.Role == UserRole.Admin))
            .OrderBy(x => x.Name)
            .Select(x => new { x.Id, x.Name, x.Email, x.Role })
            .ToListAsync(cancellationToken);

        // Contagem de leads por dono em uma única consulta agregada (evita N+1).
        var leadCounts = await _dbContext.Leads
            .AsNoTracking()
            .Where(x => x.OwnerUserId != null)
            .GroupBy(x => x.OwnerUserId!.Value)
            .Select(g => new { OwnerUserId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var countMap = leadCounts.ToDictionary(x => x.OwnerUserId, x => x.Count);

        return users
            .Select(x => new LeadOwnerDto
            {
                Id = x.Id,
                Name = x.Name,
                Email = x.Email,
                Role = x.Role.ToString(),
                LeadCount = countMap.TryGetValue(x.Id, out var count) ? count : 0
            })
            .ToList();
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
            LeadType = request.LeadType,
            QualificationTemperature = request.QualificationTemperature,
            QualificationScore = Math.Clamp(request.QualificationScore, 0, 100),
            QualificationNotes = request.QualificationNotes?.Trim(),
            ExtraDataJson = request.ExtraDataJson,
            OwnerUserId = request.OwnerUserId ?? user.UserId,
            Channel = request.Channel?.Trim(),
            CompanyName = request.CompanyName?.Trim(),
            ContactHandle = request.ContactHandle?.Trim(),
            NextFollowUpAtUtc = request.NextFollowUpAtUtc,
            Observations = request.Observations?.Trim(),
            City = request.City?.Trim(),
            InstagramHandle = request.InstagramHandle?.Trim(),
            GoogleRating = request.GoogleRating,
            BantBudget = request.BantBudget,
            BantAuthority = request.BantAuthority,
            BantNeed = request.BantNeed,
            BantTimeline = request.BantTimeline
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
        EnsureCanEditLead(lead);

        lead.Name = request.Name.Trim();
        lead.Email = request.Email?.Trim();
        lead.Phone = request.Phone?.Trim();
        lead.Source = request.Source.Trim();
        lead.Status = request.Status;
        lead.LeadType = request.LeadType;
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
        lead.FollowUpStep = Math.Clamp(request.FollowUpStep, 0, 7);
        lead.Observations = request.Observations?.Trim();
        lead.ProposalValue = request.ProposalValue;
        lead.City = request.City?.Trim();
        lead.InstagramHandle = request.InstagramHandle?.Trim();
        lead.GoogleRating = request.GoogleRating;
        lead.BantBudget = request.BantBudget;
        lead.BantAuthority = request.BantAuthority;
        lead.BantNeed = request.BantNeed;
        lead.BantTimeline = request.BantTimeline;
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
        EnsureCanEditLead(lead);

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
        EnsureCanEditLead(lead);

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
        EnsureCanEditLead(lead);

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

    // Aplica o mesmo recorte de visibilidade do listing: vendedor vê só os próprios leads.
    private IQueryable<Lead> VisibleLeads()
    {
        var query = _dbContext.Leads.AsQueryable();
        if (_currentUser.User?.Role == UserRole.Sales)
        {
            query = query.Where(x => x.OwnerUserId == _currentUser.User.UserId);
        }
        return query;
    }

    // Vendedor (Sales) só pode mexer em lead atribuído a ele; Admin/Gerente mexem em qualquer um.
    private void EnsureCanEditLead(Lead lead)
    {
        var user = _currentUser.User;
        if (user is not null && user.Role == UserRole.Sales && lead.OwnerUserId != user.UserId)
        {
            throw new AppException("Você só pode acessar leads atribuídos a você.", 403);
        }
    }

    // Operações em massa (importar/distribuir/limpar) são exclusivas de Admin.
    private void EnsureAdmin(string action)
    {
        if (_currentUser.User?.Role != UserRole.Admin)
        {
            throw new AppException($"Apenas administradores podem {action}.", 403);
        }
    }

    private static readonly Dictionary<FunnelStage, string> StageLabels = new()
    {
        [FunnelStage.Mapped] = "Mapeado",
        [FunnelStage.Prospected] = "Prospectado",
        [FunnelStage.Replied] = "Respondeu",
        [FunnelStage.MeetingScheduled] = "Reunião agendada",
        [FunnelStage.MeetingDone] = "Reunião feita",
        [FunnelStage.ProposalSent] = "Proposta enviada",
        [FunnelStage.Closed] = "Fechado / Perdido",
    };

    private static readonly Dictionary<LossReason, string> LossLabels = new()
    {
        [LossReason.None] = "",
        [LossReason.NoBudget] = "Sem orçamento",
        [LossReason.NoInterest] = "Sem interesse",
        [LossReason.StoppedResponding] = "Parou de responder",
        [LossReason.ClosedWithCompetitor] = "Fechou com concorrente",
        [LossReason.Other] = "Outro",
        [LossReason.NoAuthority] = "Sem autoridade",
    };

    public async Task<byte[]> ExportToExcelAsync(CancellationToken cancellationToken = default)
    {
        var leads = await VisibleLeads()
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new
            {
                x.Name,
                x.CompanyName,
                x.Channel,
                x.Email,
                x.Phone,
                x.InstagramHandle,
                x.City,
                x.GoogleRating,
                x.Source,
                x.FunnelStage,
                x.Outcome,
                x.LossReason,
                x.FollowUpStep,
                x.NextFollowUpAtUtc,
                x.ProposalValue,
                x.ContractValue,
                x.Observations,
                OwnerName = x.OwnerUser != null ? x.OwnerUser.Name : null,
                x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var headers = new[]
        {
            "Nome", "Empresa/Nicho", "Canal", "Email", "Telefone", "Instagram", "Cidade",
            "Avaliação Google", "Fonte", "Etapa", "Desfecho", "Motivo da perda", "Follow-up atual",
            "Próximo follow-up", "Valor proposta", "Valor contrato", "Observações", "Vendedor", "Criado em"
        };

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Leads");
        for (var c = 0; c < headers.Length; c++)
        {
            ws.Cell(1, c + 1).Value = headers[c];
        }
        ws.Row(1).Style.Font.Bold = true;

        var r = 2;
        foreach (var lead in leads)
        {
            ws.Cell(r, 1).Value = lead.Name;
            ws.Cell(r, 2).Value = lead.CompanyName ?? "";
            ws.Cell(r, 3).Value = lead.Channel ?? "";
            ws.Cell(r, 4).Value = lead.Email ?? "";
            ws.Cell(r, 5).Value = lead.Phone ?? "";
            ws.Cell(r, 6).Value = lead.InstagramHandle ?? "";
            ws.Cell(r, 7).Value = lead.City ?? "";
            if (lead.GoogleRating.HasValue) ws.Cell(r, 8).Value = (double)lead.GoogleRating.Value;
            ws.Cell(r, 9).Value = lead.Source ?? "";
            ws.Cell(r, 10).Value = StageLabels.GetValueOrDefault(lead.FunnelStage, lead.FunnelStage.ToString());
            ws.Cell(r, 11).Value = lead.Outcome == FunnelOutcome.Won ? "Fechado" : lead.Outcome == FunnelOutcome.Lost ? "Perdido" : "";
            ws.Cell(r, 12).Value = LossLabels.GetValueOrDefault(lead.LossReason, "");
            ws.Cell(r, 13).Value = lead.FollowUpStep;
            if (lead.NextFollowUpAtUtc.HasValue) ws.Cell(r, 14).Value = lead.NextFollowUpAtUtc.Value;
            if (lead.ProposalValue.HasValue) ws.Cell(r, 15).Value = (double)lead.ProposalValue.Value;
            if (lead.ContractValue.HasValue) ws.Cell(r, 16).Value = (double)lead.ContractValue.Value;
            ws.Cell(r, 17).Value = lead.Observations ?? "";
            ws.Cell(r, 18).Value = lead.OwnerName ?? "";
            ws.Cell(r, 19).Value = lead.CreatedAtUtc;
            r++;
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<LeadImportResultDto> ImportAsync(
        Stream fileStream,
        string fileName,
        bool distribute,
        IReadOnlyList<long>? ownerUserIds,
        string phoneDuplicateMode,
        LeadType leadType,
        CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuário não autenticado.", 401);
        EnsureAdmin("importar e distribuir leads");
        var result = new LeadImportResultDto();
        var mode = (phoneDuplicateMode ?? "ask").Trim().ToLowerInvariant();

        // Lê o arquivo inteiro para um buffer (ClosedXML precisa de stream seekable).
        using var buffer = new MemoryStream();
        await fileStream.CopyToAsync(buffer, cancellationToken);
        buffer.Position = 0;

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        List<string[]> table = ext switch
        {
            ".csv" or ".txt" => ParseCsv(Encoding.UTF8.GetString(buffer.ToArray())),
            ".xlsx" => ReadXlsx(buffer),
            _ => throw new AppException("Formato não suportado. Envie um arquivo .csv ou .xlsx.", 400),
        };

        if (table.Count < 2)
        {
            return result; // só cabeçalho ou vazio
        }

        // Mapeia cabeçalhos -> índice de coluna (primeiro que casar vence).
        var columnMap = new Dictionary<string, int>();
        var header = table[0];
        for (var c = 0; c < header.Length; c++)
        {
            var key = MapHeader(header[c]);
            if (key != null && !columnMap.ContainsKey(key))
            {
                columnMap[key] = c;
            }
        }

        if (!columnMap.ContainsKey("name"))
        {
            throw new AppException("Não encontrei a coluna \"Nome\" no arquivo. Verifique o cabeçalho.", 400);
        }

        // E-mails/telefones já existentes na base (e os vistos no próprio arquivo durante a leitura).
        var existing = await _dbContext.Leads.AsNoTracking()
            .Select(x => new { x.Email, x.Phone })
            .ToListAsync(cancellationToken);
        var emailSeen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var phoneSeen = new HashSet<string>();
        foreach (var e in existing)
        {
            if (!string.IsNullOrWhiteSpace(e.Email)) emailSeen.Add(e.Email.Trim().ToLowerInvariant());
            var p = DigitsOnly(e.Phone);
            if (p.Length > 0) phoneSeen.Add(p);
        }

        string Field(string[] row, string key) =>
            columnMap.TryGetValue(key, out var idx) && idx < row.Length ? row[idx].Trim() : "";

        // 1ª passada: monta os candidatos e marca quais têm telefone já cadastrado.
        var candidates = new List<(Lead Lead, bool IsPhoneDuplicate)>();
        for (var i = 1; i < table.Count; i++)
        {
            var row = table[i];
            if (row.All(string.IsNullOrWhiteSpace))
            {
                continue; // linha totalmente vazia: não conta
            }
            result.TotalRows++;

            try
            {
                var name = Field(row, "name");
                if (string.IsNullOrWhiteSpace(name))
                {
                    result.SkippedEmpty++;
                    continue;
                }

                var email = Field(row, "email");
                var phone = Field(row, "phone");
                var emailKey = email.ToLowerInvariant();
                var phoneKey = DigitsOnly(phone);

                // Email repetido (base ou já visto no arquivo): pulado sempre, em silêncio.
                if (!string.IsNullOrWhiteSpace(emailKey) && emailSeen.Contains(emailKey))
                {
                    result.SkippedDuplicates++;
                    continue;
                }

                var isPhoneDuplicate = phoneKey.Length > 0 && phoneSeen.Contains(phoneKey);

                decimal? googleRating = null;
                var ratingRaw = Field(row, "googleRating");
                if (!string.IsNullOrWhiteSpace(ratingRaw)
                    && decimal.TryParse(ratingRaw.Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out var rating))
                {
                    googleRating = Math.Clamp(rating, 0m, 5m);
                }

                var source = Field(row, "source");
                var channel = Field(row, "channel");
                var sourceValue = !string.IsNullOrWhiteSpace(source) ? source
                    : !string.IsNullOrWhiteSpace(channel) ? channel
                    : "Importação";

                // Trunca cada campo ao limite da coluna (planilhas de scrape têm valores longos
                // que estourariam o varchar e derrubariam o batch inteiro).
                var lead = new Lead
                {
                    CompanyId = user.CompanyId,
                    Name = Clip(name, 140)!,
                    Email = Clip(email, 180),
                    Phone = Clip(phone, 40),
                    Source = Clip(sourceValue, 100) ?? "Importação",
                    Status = LeadStatus.MessageSent,
                    LeadType = leadType,
                    OwnerUserId = user.UserId, // padrão; pode ser sobrescrito pela distribuição
                    Channel = Clip(channel, 40),
                    CompanyName = Clip(Field(row, "company"), 180),
                    ContactHandle = Clip(Field(row, "instagram"), 140),
                    InstagramHandle = Clip(Field(row, "instagram"), 140),
                    City = Clip(Field(row, "city"), 120),
                    GoogleRating = googleRating,
                    Observations = Clip(Field(row, "observations"), 2000),
                    // FunnelStage = Mapped (default) — todo lead importado entra na etapa 1.
                };

                candidates.Add((lead, isPhoneDuplicate));

                // Marca como visto para detectar repetição dentro do próprio arquivo.
                if (!string.IsNullOrWhiteSpace(emailKey)) emailSeen.Add(emailKey);
                if (phoneKey.Length > 0) phoneSeen.Add(phoneKey);
            }
            catch (Exception ex)
            {
                if (result.Errors.Count < 50)
                {
                    result.Errors.Add($"Linha {i + 1}: {ex.Message}");
                }
            }
        }

        var phoneDuplicates = candidates.Where(x => x.IsPhoneDuplicate).ToList();

        // Modo "ask": havendo telefone repetido, não grava nada e devolve para o front confirmar.
        if (mode == "ask" && phoneDuplicates.Count > 0)
        {
            result.NeedsPhoneConfirmation = true;
            result.PhoneDuplicateCount = phoneDuplicates.Count;
            result.PhoneDuplicateSamples = phoneDuplicates
                .Take(10)
                .Select(x => $"{x.Lead.Name} · {x.Lead.Phone}")
                .ToList();
            return result;
        }

        // Define o conjunto final conforme o modo escolhido.
        List<Lead> toCreate;
        if (mode == "skip")
        {
            result.SkippedDuplicates += phoneDuplicates.Count;
            toCreate = candidates.Where(x => !x.IsPhoneDuplicate).Select(x => x.Lead).ToList();
        }
        else // "import" (ou "ask" quando não há telefone repetido)
        {
            toCreate = candidates.Select(x => x.Lead).ToList();
        }

        // Distribuição entre vendedores (equilibrando a carga).
        if (distribute && toCreate.Count > 0)
        {
            await DistributeAmongOwnersAsync(toCreate, ownerUserIds, user.CompanyId, result, cancellationToken);
        }

        if (toCreate.Count > 0)
        {
            _dbContext.Leads.AddRange(toCreate);
            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException ex)
            {
                // Expõe a causa real do banco (a mensagem do EF esconde na inner exception).
                var detail = ex.GetBaseException().Message;
                throw new AppException($"Erro ao salvar os leads importados: {detail}", 400);
            }
            await _eventLogService.LogAsync(
                EventLogType.LeadCreated,
                new { Imported = toCreate.Count, Source = "Import", Distributed = distribute },
                cancellationToken: cancellationToken);
        }

        result.Imported = toCreate.Count;
        return result;
    }

    // Divide os leads recém-criados entre os vendedores elegíveis. Cada lead vai para o vendedor
    // com o MENOR total atual (leads em aberto + já recebidos nesta importação), nivelando a carga.
    private async Task DistributeAmongOwnersAsync(
        List<Lead> leads,
        IReadOnlyList<long>? requestedOwnerIds,
        long companyId,
        LeadImportResultDto result,
        CancellationToken cancellationToken)
    {
        var eligibleQuery = _dbContext.Users.AsNoTracking()
            .Where(u => u.IsActive && u.CompanyId == companyId);

        if (requestedOwnerIds is { Count: > 0 })
        {
            var requested = requestedOwnerIds.ToList();
            eligibleQuery = eligibleQuery.Where(u => requested.Contains(u.Id));
        }
        else
        {
            // Padrão: apenas vendedores (papel Sales) ativos.
            eligibleQuery = eligibleQuery.Where(u => u.Role == UserRole.Sales);
        }

        var eligible = await eligibleQuery
            .OrderBy(u => u.Id)
            .Select(u => new { u.Id, u.Name })
            .ToListAsync(cancellationToken);

        if (eligible.Count == 0)
        {
            // Sem vendedores elegíveis: mantém o dono padrão (quem importou).
            return;
        }

        var ids = eligible.Select(e => e.Id).ToArray();
        var names = eligible.Select(e => e.Name).ToArray();

        // Carga atual = leads em aberto (etapa != Fechado) já atribuídos a cada vendedor.
        var openCounts = await _dbContext.Leads.AsNoTracking()
            .Where(l => l.FunnelStage != FunnelStage.Closed && l.OwnerUserId != null && ids.Contains(l.OwnerUserId!.Value))
            .GroupBy(l => l.OwnerUserId!.Value)
            .Select(g => new { OwnerUserId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);
        var countMap = openCounts.ToDictionary(x => x.OwnerUserId, x => x.Count);

        var totals = ids.Select(id => countMap.GetValueOrDefault(id, 0)).ToArray();
        var assigned = new int[ids.Length];

        foreach (var lead in leads)
        {
            var best = 0;
            for (var k = 1; k < ids.Length; k++)
            {
                if (totals[k] < totals[best] || (totals[k] == totals[best] && ids[k] < ids[best]))
                {
                    best = k;
                }
            }
            lead.OwnerUserId = ids[best];
            totals[best]++;
            assigned[best]++;
        }

        result.Distribution = Enumerable.Range(0, ids.Length)
            .Where(k => assigned[k] > 0)
            .OrderByDescending(k => assigned[k])
            .Select(k => new LeadImportAssignmentDto { OwnerUserId = ids[k], OwnerName = names[k], Assigned = assigned[k] })
            .ToList();
    }

    public async Task<LeadClearResultDto> ClearAllAsync(CancellationToken cancellationToken = default)
    {
        _ = _currentUser.User ?? throw new AppException("Usuário não autenticado.", 401);
        EnsureAdmin("limpar todos os leads");

        var leads = await _dbContext.Leads.ToListAsync(cancellationToken);
        if (leads.Count == 0)
        {
            return new LeadClearResultDto();
        }

        // Leads com negócios vinculados não podem ser apagados (mesma regra do delete individual).
        var leadIdsWithDeals = await _dbContext.Deals
            .Select(d => d.LeadId)
            .Distinct()
            .ToListAsync(cancellationToken);
        var withDeals = new HashSet<long>(leadIdsWithDeals);

        var toDelete = leads.Where(l => !withDeals.Contains(l.Id)).ToList();
        _dbContext.Leads.RemoveRange(toDelete);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _eventLogService.LogAsync(
            EventLogType.LeadDeleted,
            new { Cleared = toDelete.Count },
            cancellationToken: cancellationToken);

        return new LeadClearResultDto
        {
            Deleted = toDelete.Count,
            SkippedWithDeals = leads.Count - toDelete.Count
        };
    }

    // Normaliza para null se vazio e trunca ao tamanho máximo da coluna.
    private static string? Clip(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = value.Trim();
        return v.Length <= maxLength ? v : v[..maxLength];
    }

    private static string DigitsOnly(string? value) =>
        string.IsNullOrEmpty(value) ? "" : new string(value.Where(char.IsDigit).ToArray());

    // Normaliza um cabeçalho (sem acento, minúsculo, só letras/números) e o casa com um campo conhecido.
    private static string? MapHeader(string raw)
    {
        var n = NormalizeHeader(raw);
        return n switch
        {
            "nome" or "nomedocontato" or "contato" or "name" or "cliente" or "lead" => "name",
            "email" or "emails" or "mail" => "email",
            "telefone" or "tel" or "celular" or "phone" or "whatsapp" or "fone" or "numero" => "phone",
            "empresa" or "empresanicho" or "nicho" or "company" or "companhia" => "company",
            "canal" or "channel" or "origemcanal" => "channel",
            "instagram" or "insta" or "instagramhandle" or "arroba" or "perfil" => "instagram",
            "cidade" or "city" or "praca" => "city",
            "avaliacaogoogle" or "notagoogle" or "google" or "avaliacao" or "rating" or "googlerating" => "googleRating",
            "fonte" or "origem" or "source" => "source",
            "observacoes" or "observacao" or "obs" or "notas" or "observations" or "nota" => "observations",
            _ => null,
        };
    }

    private static string NormalizeHeader(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "";
        var formd = raw.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var ch in formd)
        {
            var cat = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (cat == UnicodeCategory.NonSpacingMark) continue; // remove acentos
            if (char.IsLetterOrDigit(ch)) sb.Append(ch);
        }
        return sb.ToString();
    }

    // Parser CSV simples com suporte a aspas, escape ("") e detecção de delimitador (',' ou ';').
    private static List<string[]> ParseCsv(string content)
    {
        content = content.TrimStart('﻿'); // remove BOM, se houver
        var firstBreak = content.IndexOfAny(new[] { '\r', '\n' });
        var headerLine = firstBreak >= 0 ? content[..firstBreak] : content;
        var delimiter = headerLine.Count(c => c == ';') > headerLine.Count(c => c == ',') ? ';' : ',';

        var rows = new List<string[]>();
        var fields = new List<string>();
        var sb = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < content.Length; i++)
        {
            var c = content[i];
            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < content.Length && content[i + 1] == '"') { sb.Append('"'); i++; }
                    else inQuotes = false;
                }
                else sb.Append(c);
            }
            else if (c == '"') inQuotes = true;
            else if (c == delimiter) { fields.Add(sb.ToString()); sb.Clear(); }
            else if (c == '\r') { /* ignora; a quebra é tratada no \n */ }
            else if (c == '\n') { fields.Add(sb.ToString()); sb.Clear(); rows.Add(fields.ToArray()); fields = new List<string>(); }
            else sb.Append(c);
        }
        if (sb.Length > 0 || fields.Count > 0)
        {
            fields.Add(sb.ToString());
            rows.Add(fields.ToArray());
        }
        return rows;
    }

    private static List<string[]> ReadXlsx(Stream stream)
    {
        var table = new List<string[]>();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.FirstOrDefault();
        if (ws == null) return table;

        var rowsUsed = ws.RowsUsed().ToList();
        if (rowsUsed.Count == 0) return table;

        var lastCol = rowsUsed[0].LastCellUsed()?.Address.ColumnNumber ?? 0;
        foreach (var row in rowsUsed)
        {
            var arr = new string[lastCol];
            for (var c = 1; c <= lastCol; c++)
            {
                arr[c - 1] = row.Cell(c).GetString().Trim();
            }
            table.Add(arr);
        }
        return table;
    }

    private static LeadDto ToDto(Lead lead, string? ownerName = null) => new()
    {
        Id = lead.Id,
        Name = lead.Name,
        Email = lead.Email,
        Phone = lead.Phone,
        Source = lead.Source,
        Status = lead.Status,
        LeadType = lead.LeadType,
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
        FollowUpStep = lead.FollowUpStep,
        City = lead.City,
        InstagramHandle = lead.InstagramHandle,
        GoogleRating = lead.GoogleRating,
        BantBudget = lead.BantBudget,
        BantAuthority = lead.BantAuthority,
        BantNeed = lead.BantNeed,
        BantTimeline = lead.BantTimeline
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
