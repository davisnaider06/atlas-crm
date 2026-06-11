using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Security;
using AtlasCRM.Application.Contracts.WhatsApp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Route("whatsapp")]
public sealed class WhatsAppController : ControllerBase
{
    private readonly IWhatsAppIntegrationService _whatsAppIntegrationService;
    private readonly IWhatsAppInboxService _whatsAppInboxService;

    public WhatsAppController(
        IWhatsAppIntegrationService whatsAppIntegrationService,
        IWhatsAppInboxService whatsAppInboxService)
    {
        _whatsAppIntegrationService = whatsAppIntegrationService;
        _whatsAppInboxService = whatsAppInboxService;
    }

    [Authorize(Policy = CrmPermissions.WhatsAppManage)]
    [HttpGet("integracao")]
    public async Task<ActionResult<WhatsAppIntegrationDto>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _whatsAppIntegrationService.GetAsync(cancellationToken));
    }

    [Authorize(Policy = CrmPermissions.WhatsAppManage)]
    [HttpPut("integracao")]
    public async Task<ActionResult<WhatsAppIntegrationDto>> Put(
        [FromBody] UpdateWhatsAppIntegrationRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _whatsAppIntegrationService.SaveAsync(request, cancellationToken));
    }

    [Authorize(Policy = CrmPermissions.WhatsAppManage)]
    [HttpPost("conectar")]
    public async Task<ActionResult<WhatsAppConnectionSessionDto>> StartConnection(CancellationToken cancellationToken)
    {
        return Ok(await _whatsAppIntegrationService.StartQrConnectionAsync(cancellationToken));
    }

    [Authorize(Policy = CrmPermissions.WhatsAppManage)]
    [HttpGet("sessao")]
    public async Task<ActionResult<WhatsAppConnectionSessionDto>> GetSession(CancellationToken cancellationToken)
    {
        return Ok(await _whatsAppIntegrationService.GetConnectionSessionAsync(cancellationToken));
    }

    [Authorize(Policy = CrmPermissions.WhatsAppManage)]
    [HttpPost("campanhas/disparo")]
    public async Task<ActionResult<WhatsAppCampaignResultDto>> SendCampaign(
        [FromBody] SendWhatsAppCampaignRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _whatsAppIntegrationService.SendCampaignAsync(request, cancellationToken));
    }

    [AllowAnonymous]
    [HttpPost("webhook/{companyId:long}")]
    public async Task<IActionResult> CaptureLead(
        long companyId,
        [FromBody] WhatsAppWebhookRequest request,
        CancellationToken cancellationToken)
    {
        await _whatsAppIntegrationService.CaptureLeadAsync(companyId, request, cancellationToken);
        await _whatsAppInboxService.RecordInboundAsync(companyId, request, cancellationToken);
        return Ok(new { ok = true });
    }

    [Authorize(Policy = CrmPermissions.LeadsView)]
    [HttpGet("conversas")]
    public async Task<ActionResult<IReadOnlyList<WhatsAppConversationDto>>> ListConversations(CancellationToken cancellationToken)
    {
        return Ok(await _whatsAppInboxService.ListConversationsAsync(cancellationToken));
    }

    [Authorize(Policy = CrmPermissions.LeadsView)]
    [HttpGet("conversas/{id:long}/mensagens")]
    public async Task<ActionResult<IReadOnlyList<WhatsAppMessageDto>>> GetMessages(long id, CancellationToken cancellationToken)
    {
        return Ok(await _whatsAppInboxService.GetMessagesAsync(id, cancellationToken));
    }

    [Authorize(Policy = CrmPermissions.LeadsView)]
    [HttpPost("conversas/{id:long}/mensagens")]
    public async Task<ActionResult<WhatsAppMessageDto>> SendMessage(
        long id,
        [FromBody] SendWhatsAppMessageRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _whatsAppInboxService.SendMessageAsync(id, request, cancellationToken));
    }
}
