using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(AtlasCrmDbContext dbContext)
    {
        await dbContext.Database.EnsureCreatedAsync();
    }
}
