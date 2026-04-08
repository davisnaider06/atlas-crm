using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.WhatsApp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize]
[Route("whatsapp")]
public sealed class WhatsAppController : ControllerBase
{
    private readonly IWhatsAppIntegrationService _whatsAppIntegrationService;

    public WhatsAppController(IWhatsAppIntegrationService whatsAppIntegrationService)
    {
        _whatsAppIntegrationService = whatsAppIntegrationService;
    }

    [HttpGet("integracao")]
    public async Task<ActionResult<WhatsAppIntegrationDto>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _whatsAppIntegrationService.GetAsync(cancellationToken));
    }

    [HttpPut("integracao")]
    public async Task<ActionResult<WhatsAppIntegrationDto>> Put(
        [FromBody] UpdateWhatsAppIntegrationRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _whatsAppIntegrationService.SaveAsync(request, cancellationToken));
    }
}
