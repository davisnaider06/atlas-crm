namespace AtlasCRM.Application.Contracts.WhatsApp;

public sealed class SendWhatsAppCampaignRequest
{
    public string Message { get; set; } = string.Empty;
    public List<WhatsAppCampaignRecipientDto> Recipients { get; set; } = [];
}
