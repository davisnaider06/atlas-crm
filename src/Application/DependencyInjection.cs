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
        services.AddScoped<IPublicLeadCaptureService, PublicLeadCaptureService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IDocumentService, DocumentService>();
        services.AddScoped<IFinanceService, FinanceService>();
        services.AddScoped<IDealService, DealService>();
        services.AddScoped<IActivityService, ActivityService>();
        services.AddScoped<IPipelineService, PipelineService>();
        services.AddScoped<IAutomationService, AutomationService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IHistoryService, HistoryService>();
        services.AddScoped<IWhatsAppIntegrationService, WhatsAppIntegrationService>();
        services.AddScoped<ITeamMemberService, TeamMemberService>();

        return services;
    }
}
