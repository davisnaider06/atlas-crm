namespace AtlasCRM.Domain.Enums;

/// <summary>
/// Motivo de perda — opções fixas (nunca texto livre). Obrigatório ao marcar um lead como Perdido.
/// </summary>
public enum LossReason
{
    None = 0,                  // sem motivo (lead ainda não perdido)
    NoBudget = 1,              // sem orçamento / sem verba
    NoInterest = 2,            // sem interesse
    StoppedResponding = 3,     // parou de responder / fantasma
    ClosedWithCompetitor = 4,  // fechou com concorrente
    Other = 5,                 // outro
    NoAuthority = 6            // sem autoridade (não é o decisor)
}
