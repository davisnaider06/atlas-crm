using System.Text.Json;
using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Security;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace AtlasCRM.API.Security;

public sealed record ClerkIdentity(string Email, string Name);

/// <summary>
/// Valida session tokens do Clerk contra o JWKS do issuer e resolve email/nome
/// (via claims do token ou, em fallback, pela Backend API do Clerk).
/// </summary>
public sealed class ClerkAuthenticator
{
    private readonly ClerkOptions _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ConfigurationManager<OpenIdConnectConfiguration>? _configurationManager;
    private readonly JsonWebTokenHandler _tokenHandler = new();

    public ClerkAuthenticator(IOptions<ClerkOptions> options, IHttpClientFactory httpClientFactory)
    {
        _options = options.Value;
        _httpClientFactory = httpClientFactory;

        if (_options.Enabled)
        {
            var authority = _options.Authority.TrimEnd('/');
            _configurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
                $"{authority}/.well-known/openid-configuration",
                new OpenIdConnectConfigurationRetriever());
        }
    }

    public async Task<ClerkIdentity> AuthenticateAsync(string token, CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled || _configurationManager is null)
        {
            throw new AppException("Login com Clerk não está configurado no servidor.", 501);
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            throw new AppException("Token do Clerk não informado.", 400);
        }

        var configuration = await _configurationManager.GetConfigurationAsync(cancellationToken);

        var result = await _tokenHandler.ValidateTokenAsync(token, new TokenValidationParameters
        {
            ValidIssuer = _options.Authority.TrimEnd('/'),
            ValidateIssuer = true,
            ValidateAudience = false,
            ValidateLifetime = true,
            IssuerSigningKeys = configuration.SigningKeys
        });

        if (!result.IsValid)
        {
            throw new AppException("Token do Clerk inválido ou expirado.", 401);
        }

        result.Claims.TryGetValue("sub", out var subClaim);
        var clerkUserId = subClaim?.ToString();
        if (string.IsNullOrWhiteSpace(clerkUserId))
        {
            throw new AppException("Token do Clerk sem identificador de usuário.", 401);
        }

        // Caminho rápido: claims customizadas no session token (configuráveis no dashboard do Clerk)
        result.Claims.TryGetValue("email", out var emailClaim);
        result.Claims.TryGetValue("name", out var nameClaim);
        var email = emailClaim?.ToString();
        var name = nameClaim?.ToString();

        if (string.IsNullOrWhiteSpace(email))
        {
            (email, name) = await FetchUserFromClerkApiAsync(clerkUserId, cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            throw new AppException(
                "Não foi possível obter o email do usuário no Clerk. Configure Clerk:SecretKey no servidor ou adicione a claim \"email\" ao session token.",
                502);
        }

        return new ClerkIdentity(email, name ?? string.Empty);
    }

    private async Task<(string? Email, string? Name)> FetchUserFromClerkApiAsync(string clerkUserId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.SecretKey))
        {
            return (null, null);
        }

        var client = _httpClientFactory.CreateClient("clerk");
        using var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.clerk.com/v1/users/{clerkUserId}");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _options.SecretKey);

        using var response = await client.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new AppException("Falha ao consultar o usuário na API do Clerk.", 502);
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var json = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var root = json.RootElement;

        string? email = null;
        var primaryEmailId = root.TryGetProperty("primary_email_address_id", out var primaryIdProp)
            ? primaryIdProp.GetString()
            : null;

        if (root.TryGetProperty("email_addresses", out var emails) && emails.ValueKind == JsonValueKind.Array)
        {
            foreach (var entry in emails.EnumerateArray())
            {
                var id = entry.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
                var address = entry.TryGetProperty("email_address", out var addressProp) ? addressProp.GetString() : null;
                if (email is null || (primaryEmailId is not null && id == primaryEmailId))
                {
                    email = address;
                }
            }
        }

        var firstName = root.TryGetProperty("first_name", out var firstProp) ? firstProp.GetString() : null;
        var lastName = root.TryGetProperty("last_name", out var lastProp) ? lastProp.GetString() : null;
        var name = string.Join(' ', new[] { firstName, lastName }.Where(part => !string.IsNullOrWhiteSpace(part)));

        return (email, string.IsNullOrWhiteSpace(name) ? null : name);
    }
}
