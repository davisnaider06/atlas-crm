namespace AtlasCRM.Domain.Enums;

/// <summary>
/// Origem operacional do lead, usada para separar o CRM em duas frentes:
/// Inbound (tráfego pago/landing) e Outbound (cold call/prospecção ativa).
/// </summary>
public enum LeadType
{
    Inbound = 1,
    Outbound = 2
}
