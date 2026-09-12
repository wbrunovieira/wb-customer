import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
  ApiParam,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { ValidateSocialContentUseCase } from '@/domain/social/application/use-cases/validate-social-content.use-case'
import { CreateAttributionLinkUseCase } from '@/domain/social/application/use-cases/create-attribution-link.use-case'
import { CurrentUser } from '@/infra/auth/decorators/current-user.decorator'

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

// ── Atribuição ───────────────────────────────────────────────────────────────

class CreateAttributionLinkDto {
  @ApiProperty({ example: 'instagram', description: 'Rede de onde a conversa virá.' })
  source!: string

  @ApiProperty({ example: '+55 24 99999-8888', description: 'Telefone que receberá a conversa.' })
  destinationPhone!: string

  @ApiPropertyOptional({
    example: 'Quero encomendar uma peça',
    description: 'Texto que o cliente vê ao abrir a conversa. O marcador é anexado ao fim.',
  })
  baseMessage?: string

  @ApiPropertyOptional({
    example: 'carrossel-semana-3',
    description: 'Referência ao post, para saber qual publicação gerou a conversa.',
  })
  postRef?: string
}

@ApiTags('Social')
@ApiBearerAuth()
@Controller('customers/:customerId/social/attribution-links')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class SocialAttributionController {
  constructor(private readonly createLink: CreateAttributionLinkUseCase) {}

  @Post()
  @ApiOperation({
    summary: 'Gerar link rastreável de WhatsApp para um post',
    description:
      'Devolve um wa.me com texto pré-preenchido carregando um código curto. Quando a pessoa abre a conversa pelo post, a primeira mensagem chega com o código e o webhook atribui a conversa àquela publicação. É o que permite responder quantas conversas o Instagram gerou — pergunta que nenhum dado existente responde, porque nem Activity nem WhatsAppMessage guardam origem.',
  })
  @ApiParam({ name: 'customerId', description: 'Cliente dono da conta social' })
  @ApiBody({ type: CreateAttributionLinkDto })
  @ApiResponse({
    status: 201,
    description: 'Link gerado',
    schema: {
      example: {
        linkId: '2f6c…',
        code: 'K7MQ2A',
        prefilledMessage: 'Olá! Vim pelo Instagram. [ref: K7MQ2A]',
        url: 'https://wa.me/5524999998888?text=Ol%C3%A1!%20Vim%20pelo%20Instagram.%20%5Bref%3A%20K7MQ2A%5D',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async create(
    @Param('customerId') customerId: string,
    @Body() body: CreateAttributionLinkDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.createLink.execute({
      customerId,
      source: body.source,
      destinationPhone: body.destinationPhone,
      baseMessage: body.baseMessage,
      postRef: body.postRef,
      createdByUserId: user.userId,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)

    return result.value
  }
}
