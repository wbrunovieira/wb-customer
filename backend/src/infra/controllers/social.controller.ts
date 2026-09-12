import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { ValidateSocialContentUseCase } from '@/domain/social/application/use-cases/validate-social-content.use-case'

// ── DTOs ─────────────────────────────────────────────────────────────────────

class ValidateContentDto {
  @ApiProperty({
    example: 'Crochê artesanal — peças a partir de R$ 120, desde 2003.',
    description: 'Texto do post a ser conferido contra as regras editoriais.',
  })
  content!: string
}

// ── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Social')
@ApiBearerAuth()
@Controller('social')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class SocialController {
  constructor(private readonly validateContent: ValidateSocialContentUseCase) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Conferir um texto contra as regras editoriais da casa',
    description:
      'Bloqueia travessão, menção a preço ("R$", "a partir de", "barato") e alegação de fundação anterior a 2023; alerta sobre "desde 2023" sem bloquear. Devolve ok=false quando há violação de bloqueio, e cada violação traz o trecho e a posição para destacar no texto. Serve tanto no caminho do salvamento quanto como conferência avulsa antes de publicar em qualquer lugar.',
  })
  @ApiBody({ type: ValidateContentDto })
  @ApiResponse({
    status: 200,
    description: 'Resultado da conferência',
    schema: {
      example: {
        ok: false,
        violations: [
          {
            ruleId: 'em-dash',
            severity: 'block',
            message: 'Travessão não é usado nos textos da casa. Reescreva a frase ou use vírgula, ponto ou dois-pontos.',
            excerpt: 'Crochê artesanal — peças a partir de R$ 120…',
            index: 17,
          },
        ],
      },
    },
  })
  async validate(@Body() body: ValidateContentDto) {
    const result = this.validateContent.execute({ content: body.content })

    // O use-case não retorna left: texto ruim é resultado, não erro.
    if (result.isLeft()) throw result.value

    return result.value
  }
}
