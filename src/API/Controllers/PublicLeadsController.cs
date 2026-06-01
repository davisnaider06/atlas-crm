using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.Leads;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[AllowAnonymous]
[EnableCors("public-leads")]
[Route("public/leads")]
public sealed class PublicLeadsController : ControllerBase
{
    private const string ApiKeyHeaderName = "X-Atlas-Public-Key";
    private readonly IPublicLeadCaptureService _publicLeadCaptureService;

    public PublicLeadsController(IPublicLeadCaptureService publicLeadCaptureService)
    {
        _publicLeadCaptureService = publicLeadCaptureService;
    }

    [HttpPost]
    public async Task<ActionResult<PublicLeadCaptureResponse>> Post(
        [FromBody] PublicLeadCaptureRequest request,
        CancellationToken cancellationToken)
    {
        var apiKey = Request.Headers[ApiKeyHeaderName].FirstOrDefault();
        var response = await _publicLeadCaptureService.CaptureAsync(request, apiKey, cancellationToken);
        return Ok(response);
    }
}
