namespace AtlasCRM.Application.Common.Security;

public static class CrmPermissions
{
    public const string DashboardView = "dashboard.view";
    public const string LeadsView = "leads.view";
    public const string LeadsCreate = "leads.create";
    public const string LeadsEdit = "leads.edit";
    public const string LeadsDelete = "leads.delete";
    public const string CustomersView = "customers.view";
    public const string CustomersCreate = "customers.create";
    public const string CustomersEdit = "customers.edit";
    public const string CustomersDelete = "customers.delete";
    public const string DealsView = "deals.view";
    public const string DealsCreate = "deals.create";
    public const string DealsEdit = "deals.edit";
    public const string DealsDelete = "deals.delete";
    public const string ActivitiesView = "activities.view";
    public const string ActivitiesCreate = "activities.create";
    public const string ActivitiesEdit = "activities.edit";
    public const string ActivitiesDelete = "activities.delete";
    public const string DocumentsView = "documents.view";
    public const string DocumentsCreate = "documents.create";
    public const string DocumentsDelete = "documents.delete";
    public const string AutomationsManage = "automations.manage";
    public const string WhatsAppManage = "whatsapp.manage";
    public const string FinanceManage = "finance.manage";
    public const string SettingsView = "settings.view";
    public const string TeamManage = "team.manage";
    public const string SchedulesView = "schedules.view";
    public const string SchedulesCreate = "schedules.create";
    public const string SchedulesEdit = "schedules.edit";
    public const string SchedulesDelete = "schedules.delete";

    public static readonly string[] All = new[]
    {
        DashboardView,
        LeadsView,
        LeadsCreate,
        LeadsEdit,
        LeadsDelete,
        CustomersView,
        CustomersCreate,
        CustomersEdit,
        CustomersDelete,
        DealsView,
        DealsCreate,
        DealsEdit,
        DealsDelete,
        ActivitiesView,
        ActivitiesCreate,
        ActivitiesEdit,
        ActivitiesDelete,
        DocumentsView,
        DocumentsCreate,
        DocumentsDelete,
        FinanceManage,
        AutomationsManage,
        WhatsAppManage,
        SettingsView,
        TeamManage,
        SchedulesView,
        SchedulesCreate,
        SchedulesEdit,
        SchedulesDelete
    };
}
