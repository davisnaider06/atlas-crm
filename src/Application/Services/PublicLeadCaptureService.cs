using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Security;
using AtlasCRM.Application.Contracts.Leads;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AtlasCRM.Application.Services;

public sealed class PublicLeadCaptureService : IPublicLeadCaptureService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IEventLogService _eventLogService;
    private readonly PublicLeadCaptureOptions _options;

    public PublicLeadCaptureService(
        IApplicationDbContext dbContext,
        IEventLogService eventLogService,
        IOptions<PublicLeadCaptureOptions> options)
    {
        _dbContext = dbContext;
        _eventLogService = eventLogService;
        _options = options.Value;
    }

    public async Task<PublicLeadCaptureResponse> CaptureAsync(
        PublicLeadCaptureRequest request,
        string? apiKey,
        CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
        {
            throw new AppException("Captura publica de leads desativada.", 403);
        }

        if (!ApiKeyMatches(apiKey))
        {
            throw new AppException("Chave de captura invalida.", 401);
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new AppException("Nome do lead e obrigatorio.", 400);
        }

        if (string.IsNullOrWhiteSpace(request.Email) && string.IsNullOrWhiteSpace(request.Phone))
        {
            throw new AppException("Informe email ou telefone para contato.", 400);
        }

        var companyExists = await _dbContext.Companies
            .AnyAsync(x => x.Id == _options.CompanyId, cancellationToken);
        if (!companyExists)
        {
            throw new AppException("Empresa configurada para captura publica nao encontrada.", 500);
        }

        var qualification = Qualify(request);
        var ownerUserId = await ResolveOwnerUserIdAsync(_options.CompanyId, cancellationToken);
        var source = string.IsNullOrWhiteSpace(request.Source) ? _options.DefaultSource : request.Source.Trim();

        var lead = new Lead
        {
            CompanyId = _options.CompanyId,
            Name = request.Name.Trim(),
            Email = request.Email?.Trim(),
            Phone = request.Phone?.Trim(),
            Source = source,
            Status = qualification.Temperature == LeadTemperature.Hot ? LeadStatus.Qualified : LeadStatus.MessageSent,
            QualificationTemperature = qualification.Temperature,
            QualificationScore = qualification.Score,
            QualificationNotes = qualification.Notes,
            ExtraDataJson = BuildExtraDataJson(request),
            OwnerUserId = ownerUserId
        };

        _dbContext.Leads.Add(lead);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _eventLogService.LogAsync(
            EventLogType.LeadCreated,
            new
            {
                lead.Id,
                lead.Name,
                lead.Source,
                lead.Status,
                lead.QualificationTemperature,
                lead.QualificationScore,
                lead.OwnerUserId,
                Trigger = "PublicLeadCapture"
            },
            lead.CompanyId,
            cancellationToken);

        return new PublicLeadCaptureResponse
        {
            LeadId = lead.Id,
            QualificationTemperature = lead.QualificationTemperature,
            QualificationScore = lead.QualificationScore,
            OwnerUserId = lead.OwnerUserId
        };
    }

    private bool ApiKeyMatches(string? apiKey)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey) || string.IsNullOrWhiteSpace(apiKey))
        {
            return false;
        }

        var expected = Encoding.UTF8.GetBytes(_options.ApiKey);
        var actual = Encoding.UTF8.GetBytes(apiKey.Trim());
        return expected.Length == actual.Length && CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    private async Task<long?> ResolveOwnerUserIdAsync(long companyId, CancellationToken cancellationToken)
    {
        var openStatuses = new[] { LeadStatus.MessageSent, LeadStatus.New, LeadStatus.Contacted, LeadStatus.Qualified };

        var salesUsers = await _dbContext.Users
            .Where(x => x.CompanyId == companyId && x.IsActive && x.Role == UserRole.Sales)
            .Select(x => new
            {
                x.Id,
                OpenLeads = _dbContext.Leads.Count(lead =>
                    lead.CompanyId == companyId &&
                    lead.OwnerUserId == x.Id &&
                    openStatuses.Contains(lead.Status))
            })
            .OrderBy(x => x.OpenLeads)
            .ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);

        if (salesUsers.Count > 0)
        {
            return salesUsers[0].Id;
        }

        return await _dbContext.Users
            .Where(x => x.CompanyId == companyId && x.IsActive && x.Role == UserRole.Manager)
            .OrderBy(x => x.Id)
            .Select(x => (long?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static QualificationResult Qualify(PublicLeadCaptureRequest request)
    {
        var score = 0;
        var reasons = new List<string>();

        AddIf(!string.IsNullOrWhiteSpace(request.Phone), 15, "telefone informado");
        AddIf(!string.IsNullOrWhiteSpace(request.Email), 10, "email informado");
        AddIf(IsDecisionMaker(request.Role), 15, "perfil decisor");
        AddIf(HasStrongBudget(request.Budget), 25, "orcamento confirmado");
        AddIf(HasPossibleBudget(request.Budget), 10, "orcamento em avaliacao");
        AddIf(HasUrgentTiming(request.Urgency), 30, "urgencia alta");
        AddIf(HasNearTiming(request.Urgency), 15, "prazo proximo");
        AddIf(HasGoodRevenueSignal(request.MonthlyRevenue), 20, "faturamento com fit");
        AddIf(!string.IsNullOrWhiteSpace(request.Interest), 10, "interesse descrito");

        if (HasNegativeBudget(request.Budget))
        {
            score -= 20;
            reasons.Add("sem orcamento declarado");
        }

        if (string.IsNullOrWhiteSpace(request.Email) && string.IsNullOrWhiteSpace(request.Phone))
        {
            score -= 30;
            reasons.Add("sem canal de contato");
        }

        score = Math.Clamp(score, 0, 100);
        var temperature = score switch
        {
            >= 75 => LeadTemperature.Hot,
            >= 45 => LeadTemperature.Warm,
            >= 10 => LeadTemperature.Cold,
            _ => LeadTemperature.Unqualified
        };

        return new QualificationResult(temperature, score, string.Join("; ", reasons));

        void AddIf(bool condition, int points, string reason)
        {
            if (!condition)
            {
                return;
            }

            score += points;
            reasons.Add(reason);
        }
    }

    private static string BuildExtraDataJson(PublicLeadCaptureRequest request)
    {
        return JsonSerializer.Serialize(new
        {
            request.CompanyName,
            request.Role,
            request.MonthlyRevenue,
            request.Budget,
            request.Urgency,
            request.Interest,
            request.Notes,
            request.Metadata
        });
    }

    private static bool IsDecisionMaker(string? value) =>
        ContainsAny(value, "dono", "socio", "socia", "ceo", "fundador", "fundadora", "diretor", "diretora", "gestor", "gestora");

    private static bool HasStrongBudget(string? value) =>
        ContainsAny(value, "sim", "aprovado", "definido", "tenho", "possuo");

    private static bool HasPossibleBudget(string? value) =>
        ContainsAny(value, "talvez", "avaliando", "depende", "parcial");

    private static bool HasNegativeBudget(string? value) =>
        ContainsAny(value, "nao", "sem", "nenhum");

    private static bool HasUrgentTiming(string? value) =>
        ContainsAny(value, "agora", "hoje", "imediato", "urgente", "esta semana");

    private static bool HasNearTiming(string? value) =>
        ContainsAny(value, "mes", "30", "quinzena", "semana");

    private static bool HasGoodRevenueSignal(string? value) =>
        ContainsAny(value, "50", "100", "200", "500", "1m", "milhao", "milhoes", "alto");

    private static bool ContainsAny(string? value, params string[] tokens)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return tokens.Any(token => value.Contains(token, StringComparison.OrdinalIgnoreCase));
    }

    private sealed record QualificationResult(LeadTemperature Temperature, int Score, string Notes);
}
