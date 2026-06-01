using System.Text;
using System.Text.Json.Serialization;
using AtlasCRM.Application;
using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Security;
using AtlasCRM.API.Security;
using AtlasCRM.Infrastructure;
using AtlasCRM.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;


var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<PublicLeadCaptureOptions>(builder.Configuration.GetSection(PublicLeadCaptureOptions.SectionName));
var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
var publicLeadOptions = builder.Configuration.GetSection(PublicLeadCaptureOptions.SectionName).Get<PublicLeadCaptureOptions>() ?? new PublicLeadCaptureOptions();
var webCorsOrigins = new[]
{
    "http://localhost:3000",
    "http://localhost:3001",
    "https://atlas-crm-theta.vercel.app",
    "https://atlas-ten-smoky.vercel.app",
    builder.Configuration["FrontendUrl"]
}
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(origin => NormalizeOrigin(origin!))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddHttpClient("whatsapp");
builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddPolicy("web", policy =>
    {
        policy
            .WithOrigins(webCorsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });

    options.AddPolicy("public-leads", policy =>
    {
        if (publicLeadOptions.CorsOrigins.Length > 0)
        {
            policy.WithOrigins(publicLeadOptions.CorsOrigins.Select(NormalizeOrigin).ToArray());
        }
        else
        {
            policy.AllowAnyOrigin();
        }

        policy
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey))
        };
    });

builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
builder.Services.AddAuthorization(options =>
{
    foreach (var permission in CrmPermissions.All)
    {
        options.AddPermissionPolicy(permission);
    }
});

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";

builder.WebHost.UseUrls($"http://*:{port}");


var app = builder.Build();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        var statusCode = exception is AppException appException ? appException.StatusCode : 500;

        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(new
        {
            error = exception?.Message ?? "Erro interno."
        });
    });
});

using (var scope = app.Services.CreateScope())
{
    var autoCreateSchema = builder.Configuration.GetValue<bool>("Database:AutoCreateSchema");
    if (autoCreateSchema)
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<AtlasCrmDbContext>();
        await DatabaseInitializer.InitializeAsync(dbContext);
    }
    else
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<AtlasCrmDbContext>();
        await DatabaseInitializer.EnsureRuntimeSchemaAsync(dbContext);
    }
}

// if (app.Environment.IsDevelopment())
// {
//     app.MapOpenApi();
// }

app.MapOpenApi();

app.UseCors("web");
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();
app.Run();

static string NormalizeOrigin(string origin) => origin.Trim().TrimEnd('/');
