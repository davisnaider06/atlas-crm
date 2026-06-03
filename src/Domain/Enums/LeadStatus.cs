namespace AtlasCRM.Domain.Enums;

public enum LeadStatus
{
    New = 1,
    Contacted = 2,
    Qualified = 3,
    Lost = 4,
    Converted = 5
    ,
    // Novos status adicionados para categorias mais claras
    MessageSent = 6,
    FollowUp = 7,
    InNegotiation = 8,
    MeetingScheduled = 9
}
