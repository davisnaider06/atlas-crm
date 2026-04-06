using AtlasCRM.Application.Common.Exceptions;
using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Contracts.Pipelines;
using AtlasCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AtlasCRM.Application.Services;

public sealed class PipelineService : IPipelineService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;

    public PipelineService(IApplicationDbContext dbContext, ICurrentUserService currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<PipelineDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Pipelines
            .AsNoTracking()
            .Include(x => x.Stages)
            .OrderBy(x => x.Name)
            .Select(x => new PipelineDto
            {
                Id = x.Id,
                Name = x.Name,
                Stages = x.Stages
                    .OrderBy(s => s.Order)
                    .Select(s => new StageDto
                    {
                        Id = s.Id,
                        Name = s.Name,
                        Order = s.Order
                    })
                    .ToList()
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<PipelineDto> CreateAsync(CreatePipelineRequest request, CancellationToken cancellationToken = default)
    {
        var user = _currentUser.User ?? throw new AppException("Usuario nao autenticado.", 401);
        if (request.Stages.Count == 0)
        {
            throw new AppException("Pipeline precisa de pelo menos uma etapa.");
        }

        var pipeline = new Pipeline
        {
            CompanyId = user.CompanyId,
            Name = request.Name.Trim(),
            Stages = request.Stages
                .OrderBy(x => x.Order)
                .Select(x => new Stage
                {
                    Name = x.Name.Trim(),
                    Order = x.Order
                })
                .ToList()
        };

        _dbContext.Pipelines.Add(pipeline);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new PipelineDto
        {
            Id = pipeline.Id,
            Name = pipeline.Name,
            Stages = pipeline.Stages
                .OrderBy(x => x.Order)
                .Select(x => new StageDto { Id = x.Id, Name = x.Name, Order = x.Order })
                .ToList()
        };
    }
}
