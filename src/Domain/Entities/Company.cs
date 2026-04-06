using AtlasCRM.Domain.Common;
using AtlasCRM.Domain.Enums;

namespace AtlasCRM.Domain.Entities;

public sealed class Company : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public PlanType Plan { get; set; } = PlanType.Starter;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Lead> Leads { get; set; } = new List<Lead>();
    public ICollection<Deal> Deals { get; set; } = new List<Deal>();
    public ICollection<Pipeline> Pipelines { get; set; } = new List<Pipeline>();
    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
    public ICollection<Automation> Automations { get; set; } = new List<Automation>();
    public ICollection<EventLog> EventLogs { get; set; } = new List<EventLog>();
}
