namespace AtlasCRM.Application.Contracts.Leads;

/// <summary>Resumo de uma importação de leads via CSV/Excel.</summary>
public sealed class LeadImportResultDto
{
    /// <summary>Leads criados com sucesso.</summary>
    public int Imported { get; set; }
    /// <summary>Linhas puladas por já existir lead com o mesmo email/telefone.</summary>
    public int SkippedDuplicates { get; set; }
    /// <summary>Linhas ignoradas por estarem vazias ou sem nome.</summary>
    public int SkippedEmpty { get; set; }
    /// <summary>Total de linhas de dados lidas do arquivo (sem o cabeçalho).</summary>
    public int TotalRows { get; set; }
    /// <summary>Mensagens de erro por linha problemática (máx. algumas dezenas).</summary>
    public List<string> Errors { get; set; } = new();
}

/// <summary>Resumo da limpeza em massa de leads.</summary>
public sealed class LeadClearResultDto
{
    /// <summary>Leads efetivamente apagados.</summary>
    public int Deleted { get; set; }
    /// <summary>Leads mantidos por terem negócios vinculados (não podem ser apagados).</summary>
    public int SkippedWithDeals { get; set; }
}
