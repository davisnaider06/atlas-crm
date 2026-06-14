namespace AtlasCRM.Domain.Enums;

/// <summary>
/// Resultado de um contato registrado. Estruturado para medir qual script/abordagem gera resposta.
/// </summary>
public enum InteractionOutcome
{
    NoReply = 0,   // sem resposta
    Replied = 1,   // respondeu (neutro)
    Positive = 2,  // resposta positiva / avançou
    Negative = 3   // resposta negativa / objeção
}
