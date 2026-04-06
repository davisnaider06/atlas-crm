using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Domain.Common;
using AtlasCRM.Domain.Entities;
using AtlasCRM.Domain.Enums;
using AtlasCRM.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Infrastructure.Persistence;

public sealed class AtlasCrmDbContext : DbContext, IApplicationDbContext
{
    private readonly ICurrentUserService _currentUserService;

    public AtlasCrmDbContext(DbContextOptions<AtlasCrmDbContext> options, ICurrentUserService currentUserService) : base(options)
    {
        _currentUserService = currentUserService;
    }

    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<Automation> Automations => Set<Automation>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Deal> Deals => Set<Deal>();
    public DbSet<EventLog> EventLogs => Set<EventLog>();
    public DbSet<Lead> Leads => Set<Lead>();
    public DbSet<Pipeline> Pipelines => Set<Pipeline>();
    public DbSet<PlanLimit> PlanLimits => Set<PlanLimit>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Stage> Stages => Set<Stage>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Company>(entity =>
        {
            entity.ToTable("companies");
            entity.Property(x => x.Name).HasMaxLength(180);
            entity.HasIndex(x => x.Name);
        });

        modelBuilder.Entity<PlanLimit>(entity =>
        {
            entity.ToTable("plan_limits");
            entity.Property(x => x.Name).HasMaxLength(60);
            entity.HasIndex(x => x.Name).IsUnique();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.Property(x => x.Name).HasMaxLength(140);
            entity.Property(x => x.Email).HasMaxLength(180);
            entity.HasIndex(x => new { x.CompanyId, x.Email }).IsUnique();
            entity.HasQueryFilter(x => HasCompanyScope(x.CompanyId));
        });

        modelBuilder.Entity<Lead>(entity =>
        {
            entity.ToTable("leads");
            entity.Property(x => x.Name).HasMaxLength(140);
            entity.Property(x => x.Email).HasMaxLength(180);
            entity.Property(x => x.Phone).HasMaxLength(40);
            entity.Property(x => x.Source).HasMaxLength(100);
            entity.HasIndex(x => x.CompanyId);
            entity.HasIndex(x => new { x.CompanyId, x.Status });
            entity.HasQueryFilter(x => HasCompanyScope(x.CompanyId));
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.ToTable("customers");
            entity.HasIndex(x => x.CompanyId);
            entity.HasQueryFilter(x => HasCompanyScope(x.CompanyId));
        });

        modelBuilder.Entity<Pipeline>(entity =>
        {
            entity.ToTable("pipelines");
            entity.Property(x => x.Name).HasMaxLength(100);
            entity.HasIndex(x => x.CompanyId);
            entity.HasQueryFilter(x => HasCompanyScope(x.CompanyId));
        });

        modelBuilder.Entity<Stage>(entity =>
        {
            entity.ToTable("stages");
            entity.Property(x => x.Name).HasMaxLength(100);
            entity.HasIndex(x => new { x.PipelineId, x.Order });
        });

        modelBuilder.Entity<Deal>(entity =>
        {
            entity.ToTable("deals");
            entity.Property(x => x.Value).HasColumnType("numeric(18,2)");
            entity.HasIndex(x => x.CompanyId);
            entity.HasIndex(x => new { x.CompanyId, x.StageId });
            entity.HasQueryFilter(x => HasCompanyScope(x.CompanyId));
        });

        modelBuilder.Entity<Activity>(entity =>
        {
            entity.ToTable("activities");
            entity.Property(x => x.Description).HasMaxLength(500);
            entity.HasIndex(x => x.CompanyId);
            entity.HasIndex(x => new { x.CompanyId, x.Status });
            entity.HasQueryFilter(x => HasCompanyScope(x.CompanyId));
        });

        modelBuilder.Entity<Automation>(entity =>
        {
            entity.ToTable("automations");
            entity.HasIndex(x => x.CompanyId);
            entity.HasIndex(x => new { x.CompanyId, x.EventType });
            entity.HasQueryFilter(x => HasCompanyScope(x.CompanyId));
        });

        modelBuilder.Entity<EventLog>(entity =>
        {
            entity.ToTable("event_logs");
            entity.HasIndex(x => x.CompanyId);
            entity.HasIndex(x => new { x.CompanyId, x.Type });
            entity.HasQueryFilter(x => HasCompanyScope(x.CompanyId));
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.Property(x => x.Token).HasMaxLength(200);
            entity.HasIndex(x => x.Token).IsUnique();
            entity.HasIndex(x => x.CompanyId);
            entity.HasQueryFilter(x => HasCompanyScope(x.CompanyId));
        });

        SeedData(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAtUtc = DateTime.UtcNow;
            }
        }

        var companyId = _currentUserService.User?.CompanyId;
        if (companyId.HasValue)
        {
            foreach (var entry in ChangeTracker.Entries<TenantEntity>().Where(x => x.State == EntityState.Added && x.Entity.CompanyId == 0))
            {
                entry.Entity.CompanyId = companyId.Value;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }

    private bool HasCompanyScope(long companyId)
    {
        var currentCompanyId = _currentUserService.User?.CompanyId;
        return currentCompanyId is null || companyId == currentCompanyId.Value;
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        var seedDate = new DateTime(2026, 4, 6, 0, 0, 0, DateTimeKind.Utc);
        const string seedPasswordHash = "v1.QXRsYXNTZWVkU2FsdDEyMw==.sXHeH+ipB0y57mQKCOJMX0+xNvyj/14l1Mp0JBUHd2Y=";

        modelBuilder.Entity<Company>().HasData(new Company
        {
            Id = 1,
            Name = "Atlas CRM Demo",
            Plan = PlanType.Growth,
            CreatedAtUtc = seedDate
        });

        modelBuilder.Entity<User>().HasData(new User
        {
            Id = 1,
            CompanyId = 1,
            Name = "Admin Atlas",
            Email = "admin@atlascrm.local",
            PasswordHash = seedPasswordHash,
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAtUtc = seedDate
        });

        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = 2,
                CompanyId = 1,
                Name = "Marina Rocha",
                Email = "marina@atlascrm.local",
                PasswordHash = seedPasswordHash,
                Role = UserRole.Manager,
                IsActive = true,
                CreatedAtUtc = seedDate
            },
            new User
            {
                Id = 3,
                CompanyId = 1,
                Name = "Lucas Prado",
                Email = "lucas@atlascrm.local",
                PasswordHash = seedPasswordHash,
                Role = UserRole.Sales,
                IsActive = true,
                CreatedAtUtc = seedDate
            });

        modelBuilder.Entity<Pipeline>().HasData(new Pipeline
        {
            Id = 1,
            CompanyId = 1,
            Name = "Pipeline Principal",
            CreatedAtUtc = seedDate
        });

        modelBuilder.Entity<Stage>().HasData(
            new Stage { Id = 1, PipelineId = 1, Name = "Entrada", Order = 1, CreatedAtUtc = seedDate },
            new Stage { Id = 2, PipelineId = 1, Name = "Proposta", Order = 2, CreatedAtUtc = seedDate },
            new Stage { Id = 3, PipelineId = 1, Name = "Fechado", Order = 3, CreatedAtUtc = seedDate });

        modelBuilder.Entity<Lead>().HasData(
            new Lead
            {
                Id = 1,
                CompanyId = 1,
                Name = "Casa Aurora",
                Email = "contato@casaaurora.com",
                Phone = "+55 11 99999-0001",
                Source = "Instagram Ads",
                Status = LeadStatus.Qualified,
                OwnerUserId = 2,
                CreatedAtUtc = seedDate
            },
            new Lead
            {
                Id = 2,
                CompanyId = 1,
                Name = "Grupo Solaris",
                Email = "comercial@solaris.com",
                Phone = "+55 11 99999-0002",
                Source = "Outbound",
                Status = LeadStatus.New,
                OwnerUserId = 3,
                CreatedAtUtc = seedDate
            },
            new Lead
            {
                Id = 3,
                CompanyId = 1,
                Name = "Pontal Engenharia",
                Email = "vendas@pontal.com",
                Phone = "+55 11 99999-0003",
                Source = "Landing Page",
                Status = LeadStatus.Contacted,
                OwnerUserId = 2,
                CreatedAtUtc = seedDate
            });

        modelBuilder.Entity<Deal>().HasData(
            new Deal
            {
                Id = 1,
                CompanyId = 1,
                LeadId = 1,
                StageId = 2,
                Value = 96000m,
                Status = DealStatus.Open,
                OwnerUserId = 2,
                CreatedAtUtc = seedDate
            },
            new Deal
            {
                Id = 2,
                CompanyId = 1,
                LeadId = 2,
                StageId = 1,
                Value = 24000m,
                Status = DealStatus.Open,
                OwnerUserId = 3,
                CreatedAtUtc = seedDate
            },
            new Deal
            {
                Id = 3,
                CompanyId = 1,
                LeadId = 3,
                StageId = 3,
                Value = 65000m,
                Status = DealStatus.Won,
                OwnerUserId = 2,
                CreatedAtUtc = seedDate
            });

        modelBuilder.Entity<Activity>().HasData(
            new Activity
            {
                Id = 1,
                CompanyId = 1,
                DealId = 1,
                Type = ActivityType.Call,
                Description = "Ligar para Casa Aurora",
                DueAtUtc = seedDate.AddHours(14),
                Status = ActivityStatus.Pending,
                AssignedUserId = 2,
                CreatedAtUtc = seedDate
            },
            new Activity
            {
                Id = 2,
                CompanyId = 1,
                DealId = 2,
                Type = ActivityType.Email,
                Description = "Enviar proposta para Grupo Solaris",
                DueAtUtc = seedDate.AddHours(17),
                Status = ActivityStatus.Pending,
                AssignedUserId = 3,
                CreatedAtUtc = seedDate
            });

        modelBuilder.Entity<Automation>().HasData(
            new Automation
            {
                Id = 1,
                CompanyId = 1,
                Name = "Negocio fechado cria tarefa de onboarding",
                EventType = AutomationEventType.DealMoved,
                ConditionJson = "{\"stage\":\"Fechado\"}",
                ActionJson = "{\"type\":\"create_task\",\"name\":\"Iniciar onboarding\"}",
                IsActive = true,
                CreatedAtUtc = seedDate
            },
            new Automation
            {
                Id = 2,
                CompanyId = 1,
                Name = "Lead novo envia webhook para marketing",
                EventType = AutomationEventType.LeadCreated,
                ConditionJson = "{\"source\":\"any\"}",
                ActionJson = "{\"type\":\"webhook\",\"url\":\"https://example.com/webhook\"}",
                IsActive = true,
                CreatedAtUtc = seedDate
            });

        modelBuilder.Entity<EventLog>().HasData(
            new EventLog
            {
                Id = 1,
                CompanyId = 1,
                Type = EventLogType.LeadCreated,
                DataJson = "{\"leadId\":1,\"name\":\"Casa Aurora\"}",
                OccurredAtUtc = seedDate,
                CreatedAtUtc = seedDate
            },
            new EventLog
            {
                Id = 2,
                CompanyId = 1,
                Type = EventLogType.DealCreated,
                DataJson = "{\"dealId\":1,\"value\":96000}",
                OccurredAtUtc = seedDate,
                CreatedAtUtc = seedDate
            });
    }
}
