using AtlasCRM.API.Security;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.Auth;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Route("auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ClerkAuthenticator _clerkAuthenticator;

    public AuthController(IAuthService authService, ClerkAuthenticator clerkAuthenticator)
    {
        _authService = authService;
        _clerkAuthenticator = clerkAuthenticator;
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _authService.LoginAsync(request, cancellationToken));
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _authService.RegisterAsync(request, cancellationToken));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _authService.RefreshAsync(request, cancellationToken));
    }

    [HttpPost("clerk")]
    public async Task<ActionResult<AuthResponse>> Clerk([FromBody] ClerkLoginRequest request, CancellationToken cancellationToken)
    {
        var identity = await _clerkAuthenticator.AuthenticateAsync(request.Token, cancellationToken);
        var response = await _authService.ExternalLoginAsync(new ExternalLoginRequest
        {
            Email = identity.Email,
            Name = identity.Name,
            CompanyName = request.CompanyName
        }, cancellationToken);

        return Ok(response);
    }
}
