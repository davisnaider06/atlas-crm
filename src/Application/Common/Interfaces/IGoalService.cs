using AtlasCRM.Application.Contracts.Goals;

namespace AtlasCRM.Application.Common.Interfaces;

public interface IGoalService
{
    /// <summary>Briefing do dia do usuário logado: progresso da meta + tarefas.</summary>
    Task<DailyBriefingDto> GetMyBriefingAsync(CancellationToken cancellationToken = default);

    /// <summary>Metas + progresso de todos os SDRs (visão do gestor).</summary>
    Task<IReadOnlyList<SdrGoalDto>> GetTeamGoalsAsync(CancellationToken cancellationToken = default);

    /// <summary>Define/atualiza a meta mensal de um SDR.</summary>
    Task<SdrGoalDto> SetGoalAsync(long userId, decimal monthlyTarget, CancellationToken cancellationToken = default);
}
