using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.WhatsApp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Route("whatsapp")]
public sealed class WhatsAppController : ControllerBase
{
    private readonly IWhatsAppIntegrationService _whatsAppIntegrationService;

    public WhatsAppController(IWhatsAppIntegrationService whatsAppIntegrationService)
    {
        _whatsAppIntegrationService = whatsAppIntegrationService;
    }

    [Authorize]
    [HttpGet("integracao")]
    public async Task<ActionResult<WhatsAppIntegrationDto>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _whatsAppIntegrationService.GetAsync(cancellationToken));
    }

    [Authorize]
    [HttpPut("integracao")]
    public async Task<ActionResult<WhatsAppIntegrationDto>> Put(
        [FromBody] UpdateWhatsAppIntegrationRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _whatsAppIntegrationService.SaveAsync(request, cancellationToken));
    }

    [Authorize]
    [HttpPost("conectar")]
    public async Task<ActionResult<WhatsAppConnectionSessionDto>> StartConnection(CancellationToken cancellationToken)
    {
        return Ok(await _whatsAppIntegrationService.StartQrConnectionAsync(cancellationToken));
    }

    [Authorize]
    [HttpGet("sessao")]
    public async Task<ActionResult<WhatsAppConnectionSessionDto>> GetSession(CancellationToken cancellationToken)
    {
        return Ok(await _whatsAppIntegrationService.GetConnectionSessionAsync(cancellationToken));
    }

    [Authorize]
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
        return Ok(new { ok = true });
    }
}
