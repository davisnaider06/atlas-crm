namespace AtlasCRM.Application.Contracts.Goals;

public sealed class SdrGoalDto
{
    public long UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public decimal MonthlyTarget { get; set; }
    public decimal Achieved { get; set; }
    public decimal Remaining { get; set; }
    public double ProgressPct { get; set; }
    public int WonDeals { get; set; }
}

/// <summary>Uma tarefa do dia derivada dos leads do SDR (não é persistida).</summary>
public sealed class DailyTaskDto
{
    public string Id { get; set; } = string.Empty;
    /// <summary>overdue_followup | today_followup | no_contact | hot_no_next</summary>
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Priority { get; set; } = "normal"; // high | normal
    public long? LeadId { get; set; }
    public string? LeadName { get; set; }
    public DateTime? DueAtUtc { get; set; }
}

public sealed class DailyBriefingDto
{
    public SdrGoalDto Goal { get; set; } = new();
    public IReadOnlyList<DailyTaskDto> Tasks { get; set; } = new List<DailyTaskDto>();
    public string MonthLabel { get; set; } = string.Empty;
}

public sealed class UpdateGoalRequest
{
    public decimal MonthlyTarget { get; set; }
}
