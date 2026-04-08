using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace AtlasCRM.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ILeadService, LeadService>();
        services.AddScoped<IDealService, DealService>();
        services.AddScoped<IActivityService, ActivityService>();
        services.AddScoped<IPipelineService, PipelineService>();
        services.AddScoped<IAutomationService, AutomationService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IHistoryService, HistoryService>();
        services.AddScoped<IWhatsAppIntegrationService, WhatsAppIntegrationService>();

        return services;
    }
}
