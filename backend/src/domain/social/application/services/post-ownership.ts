import { ISocialEngineGateway } from '../gateways/i-social-engine.gateway'

/**
 * Quantos dias para trás e para frente olhar ao confirmar que o post é de um
 * grupo. Largo de propósito: a data do post é desconhecida de antemão, o custo
 * é uma consulta, e o erro que evita é agir sobre post de outro cliente.
 */
const OWNERSHIP_WINDOW_DAYS = 400
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * O motor aceita um id de post sozinho e age sobre qualquer post da
 * organização. Quem chama informa o cliente, e é essa combinação que precisa
 * bater — por isso a conferência vive aqui, num lugar só, e não copiada em cada
 * use-case que toca um post pelo id.
 */
export async function postBelongsToGroup(
  engine: ISocialEngineGateway,
  groupId: string,
  postId: string,
  now: Date,
): Promise<boolean> {
  const span = OWNERSHIP_WINDOW_DAYS * MS_PER_DAY
  const queue = await engine.listQueue({
    groupId,
    from: new Date(now.getTime() - span),
    to: new Date(now.getTime() + span),
  })

  return queue.some((p) => p.id === postId)
}
