using AtlasCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Activity> Activities { get; }
    DbSet<Automation> Automations { get; }
    DbSet<Company> Companies { get; }
    DbSet<Customer> Customers { get; }
    DbSet<CrmDocument> Documents { get; }
    DbSet<FinanceEntry> FinanceEntries { get; }
    DbSet<Deal> Deals { get; }
    DbSet<EventLog> EventLogs { get; }
    DbSet<Lead> Leads { get; }
    DbSet<Pipeline> Pipelines { get; }
    DbSet<PlanLimit> PlanLimits { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Stage> Stages { get; }
    DbSet<User> Users { get; }
    DbSet<UserPermission> UserPermissions { get; }
    DbSet<WhatsAppIntegration> WhatsAppIntegrations { get; }
    DbSet<Appointment> Appointments { get; }
    DbSet<CustomFieldDefinition> CustomFieldDefinitions { get; }
    DbSet<WhatsAppConversation> WhatsAppConversations { get; }
    DbSet<WhatsAppMessage> WhatsAppMessages { get; }
    DbSet<Script> Scripts { get; }
    DbSet<LeadInteraction> LeadInteractions { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
