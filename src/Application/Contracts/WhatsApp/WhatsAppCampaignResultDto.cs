namespace AtlasCRM.Application.Contracts.WhatsApp;

public sealed class WhatsAppCampaignResultDto
{
    public int TotalRecipients { get; set; }
    public int SentCount { get; set; }
    public int FailedCount { get; set; }
    public List<WhatsAppCampaignDispatchDto> Results { get; set; } = [];
}
