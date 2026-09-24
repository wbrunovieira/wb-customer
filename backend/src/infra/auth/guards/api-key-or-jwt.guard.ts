import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { createHash, timingSafeEqual } from 'node:crypto'
import { Env } from '@/env/env'

/**
 * Aceita duas formas de provar identidade: o JWT de uma pessoa logada, ou o
 * header `x-api-key` de um principal de máquina (agente).
 *
 * O principal de máquina recebe o papel `agent`, NÃO `admin`. A diferença é o
 * ponto: a chave só abre rotas que declaram `@Roles(..., 'agent')`, em vez de
 * virar uma chave-mestra de tudo que hoje é admin. Rotas que gastam dinheiro ou
 * criam ativos de verdade continuam exigindo gente.
 *
 * Sem INTERNAL_API_KEY no ambiente, nenhuma chave é aceita — não existe
 * fallback permissivo.
 */
@Injectable()
export class ApiKeyOrJwtGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {
    super()
  }

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>
      user?: unknown
    }>()

    const apresentada = req.headers['x-api-key']
    const esperada = this.config.get('INTERNAL_API_KEY', { infer: true })

    if (
      typeof apresentada === 'string' &&
      typeof esperada === 'string' &&
      esperada.length > 0 &&
      comparaEmTempoConstante(apresentada, esperada)
    ) {
      // userId, e não sub: é a forma que o jwt.strategy devolve e que
      // @CurrentUser() entrega aos controllers. Com 'sub' o user.userId ficava
      // undefined e ia parar em created_by_user_id, que é obrigatório — o
      // primeiro post do agente teria estourado na gravação, depois de já ter
      // sido entregue ao motor.
      //
      // O identificador fica registrado nos dados: quem olhar depois consegue
      // distinguir o que foi criado por agente do que foi criado por pessoa.
      req.user = { userId: 'machine:internal-api-key', role: 'agent' }
      return true
    }

    return super.canActivate(context)
  }
}

/**
 * Compara digests e não as strings cruas: timingSafeEqual exige comprimentos
 * iguais e estouraria ao receber uma chave de tamanho diferente — o que por si
 * só já vazaria o comprimento da chave certa.
 */
function comparaEmTempoConstante(a: string, b: string): boolean {
  const da = createHash('sha256').update(a).digest()
  const db = createHash('sha256').update(b).digest()
  return timingSafeEqual(da, db)
}
