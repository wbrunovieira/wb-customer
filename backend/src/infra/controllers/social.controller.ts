import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
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
  ApiQuery,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { ValidateSocialContentUseCase } from '@/domain/social/application/use-cases/validate-social-content.use-case'
import { CreateAttributionLinkUseCase } from '@/domain/social/application/use-cases/create-attribution-link.use-case'
import { GetAttributionPanelUseCase } from '@/domain/social/application/use-cases/get-attribution-panel.use-case'
import { CurrentUser } from '@/infra/auth/decorators/current-user.decorator'
import { ListSocialGroupsUseCase } from '@/domain/social/application/use-cases/list-social-groups.use-case'
import { LinkCustomerSocialGroupUseCase } from '@/domain/social/application/use-cases/link-customer-social-group.use-case'
import { GetCustomerSocialChannelsUseCase } from '@/domain/social/application/use-cases/get-customer-social-channels.use-case'
import { SocialEngineNotConfiguredError } from '@/domain/social/domain/exceptions/social-engine-not-configured.error'
import { SocialGroupAlreadyLinkedError } from '@/domain/social/domain/exceptions/social-group-already-linked.error'
import { PublishSocialPostUseCase } from '@/domain/social/application/use-cases/publish-social-post.use-case'
import { ListSocialPublicationsUseCase } from '@/domain/social/application/use-cases/list-social-publications.use-case'
import { PublishSocialPostsBatchUseCase } from '@/domain/social/application/use-cases/publish-social-posts-batch.use-case'
import { EmptyBatchError } from '@/domain/social/domain/exceptions/empty-batch.error'
import { BatchTooLargeError } from '@/domain/social/domain/exceptions/batch-too-large.error'
import { CustomerNotLinkedToGroupError } from '@/domain/social/domain/exceptions/customer-not-linked-to-group.error'
import { ContentRulesViolationError } from '@/domain/social/domain/exceptions/content-rules-violation.error'
import { ChannelNotAvailableError } from '@/domain/social/domain/exceptions/channel-not-available.error'
import { InvalidScheduleDateError } from '@/domain/social/domain/exceptions/invalid-schedule-date.error'
import { GetSocialQueueUseCase } from '@/domain/social/application/use-cases/get-social-queue.use-case'
import { CancelSocialPostUseCase } from '@/domain/social/application/use-cases/cancel-social-post.use-case'
import { CreativeHasNoFileError } from '@/domain/social/domain/exceptions/creative-has-no-file.error'
import { UnsupportedMediaTypeError } from '@/domain/social/domain/exceptions/unsupported-media-type.error'
import { GetSocialFeedUseCase } from '@/domain/social/application/use-cases/get-social-feed.use-case'
import { GetPostMetricsUseCase } from '@/domain/social/application/use-cases/get-post-metrics.use-case'
import { ListSocialPostMetricsUseCase } from '@/domain/social/application/use-cases/list-social-post-metrics.use-case'

/**
 * Traduz a falha do domínio para HTTP. Motor fora do ar é 503 e não 500: o
 * pedido está correto, a dependência é que não está lá.
 */
function toHttpError(error: Error): Error {
  if (error instanceof SocialEngineNotConfiguredError) {
    return new ServiceUnavailableException(error.message)
  }
  if (
    error instanceof SocialGroupAlreadyLinkedError ||
    error instanceof CustomerNotLinkedToGroupError ||
    error instanceof CreativeHasNoFileError
  ) {
    return new ConflictException(error.message)
  }
  if (error instanceof UnsupportedMediaTypeError) {
    return new UnsupportedMediaTypeException(error.message)
  }
  if (error instanceof ContentRulesViolationError) {
    // 422 e não 400: o pedido está bem formado, o texto é que não passa. As
    // violações vão no corpo porque a tela precisa destacar o trecho.
    return new UnprocessableEntityException({
      message: error.message,
      violations: error.violations,
    })
  }
  if (
    error instanceof ChannelNotAvailableError ||
    error instanceof InvalidScheduleDateError ||
    error instanceof EmptyBatchError ||
    error instanceof BatchTooLargeError
  ) {
    return new BadRequestException(error.message)
  }
  return new NotFoundException(error.message)
}

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

// ── Painel ───────────────────────────────────────────────────────────────────

@ApiTags('Social')
@ApiBearerAuth()
@Controller('customers/:customerId/social/attribution-panel')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class SocialAttributionPanelController {
  constructor(private readonly panel: GetAttributionPanelUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Conversas atribuídas por semana, origem e post',
    description:
      'Responde se entraram conversas novas, de quais posts vieram e se a curva reage à cadência. Semanas começam na segunda-feira e as vazias vêm com zero — uma curva que pula semana sem conversa esconde justamente a informação mais útil. Seguidor não entra: a venda é presencial e a rede é apoio ao porta a porta.',
  })
  @ApiParam({ name: 'customerId', description: 'Cliente' })
  @ApiQuery({ name: 'weeks', required: false, type: Number, description: 'Janela em semanas (padrão 4).' })
  @ApiResponse({
    status: 200,
    description: 'Painel de atribuição',
    schema: {
      example: {
        total: 7,
        weeks: [
          { weekStart: '2026-08-17', conversations: 0 },
          { weekStart: '2026-08-24', conversations: 2 },
          { weekStart: '2026-08-31', conversations: 1 },
          { weekStart: '2026-09-07', conversations: 4 },
        ],
        bySource: [{ source: 'instagram', conversations: 7 }],
        byPost: [
          { postRef: 'carrossel-semana-3', conversations: 5 },
          { postRef: null, conversations: 2 },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async get(@Param('customerId') customerId: string, @Query('weeks') weeks?: string) {
    const result = await this.panel.execute({
      customerId,
      weeks: weeks ? Number(weeks) : undefined,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)

    return result.value
  }
}


// ── Vínculo com o motor de publicação ────────────────────────────────────────

class LinkSocialGroupDto {
  @ApiPropertyOptional({
    example: 'clx9f2k1a0001abcd',
    nullable: true,
    description:
      'Id do grupo no Postiz. Envie null para desfazer o vínculo. O id sai de GET /social/groups.',
  })
  groupId!: string | null
}

@ApiTags('Social')
@ApiBearerAuth()
@Controller('social/groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class SocialGroupsController {
  constructor(private readonly listGroups: ListSocialGroupsUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Listar os grupos do motor de publicação, com o vínculo resolvido',
    description:
      'Cada grupo do Postiz é a conta de um cliente. A lista já diz qual cliente do wb-customer ocupa cada grupo e quantos canais estão conectados nele, que é o que permite ligar sem errar: grupo com cliente é ocupado, grupo sem cliente é candidato. Conectar a conta social e nomear o cliente continua sendo passo único na interface do Postiz — não há rota pública para isso (ver #1905).',
  })
  @ApiResponse({
    status: 200,
    description: 'Grupos disponíveis',
    schema: {
      example: {
        groups: [
          {
            id: 'clx9f2k1a0001abcd',
            name: 'Padaria do Zé',
            channels: 2,
            linkedCustomerId: '7b1e…',
            linkedCustomerName: 'Padaria do Zé LTDA',
          },
          {
            id: 'clx9f2k1a0002efgh',
            name: 'Bar do João',
            channels: 1,
            linkedCustomerId: null,
            linkedCustomerName: null,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 503, description: 'POSTIZ_API_URL/POSTIZ_API_KEY não configurados' })
  async list() {
    const result = await this.listGroups.execute()

    if (result.isLeft()) throw toHttpError(result.value)

    return result.value
  }
}

@ApiTags('Social')
@ApiBearerAuth()
@Controller('customers/:customerId/social')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class CustomerSocialGroupController {
  constructor(
    private readonly link: LinkCustomerSocialGroupUseCase,
    private readonly channels: GetCustomerSocialChannelsUseCase,
  ) {}

  @Put('group')
  @ApiOperation({
    summary: 'Ligar (ou desligar) o cliente a um grupo do motor',
    description:
      'Define em qual conta os posts deste cliente saem. O vínculo é por id, não por nome: nome de grupo é editável no Postiz e casar por texto quebraria calado, publicando na conta errada. Um grupo pertence a um cliente só — ligar um grupo já ocupado responde 409. Desligar (groupId null) funciona mesmo com o motor fora do ar, para que um vínculo errado não fique preso durante um incidente.',
  })
  @ApiParam({ name: 'customerId', description: 'Cliente do wb-customer' })
  @ApiBody({ type: LinkSocialGroupDto })
  @ApiResponse({
    status: 200,
    description: 'Vínculo gravado',
    schema: {
      example: {
        customerId: '7b1e…',
        postizGroupId: 'clx9f2k1a0001abcd',
        groupName: 'Padaria do Zé',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cliente ou grupo não encontrado' })
  @ApiResponse({ status: 409, description: 'Grupo já pertence a outro cliente' })
  @ApiResponse({ status: 503, description: 'Motor de publicação não configurado' })
  @HttpCode(HttpStatus.OK)
  async linkGroup(
    @Param('customerId') customerId: string,
    @Body() body: LinkSocialGroupDto,
  ) {
    const result = await this.link.execute({
      customerId,
      groupId: body.groupId ?? null,
    })

    if (result.isLeft()) throw toHttpError(result.value)

    return result.value
  }

  @Get('channels')
  @ApiOperation({
    summary: 'Redes em que este cliente publica hoje',
    description:
      'Decide se dá para agendar: sem canal conectado, agendar é encher fila que nunca sai. Cliente ainda não ligado responde linked=false com lista vazia, sem erro e sem depender do motor — é estado normal, não falha.',
  })
  @ApiParam({ name: 'customerId', description: 'Cliente do wb-customer' })
  @ApiResponse({
    status: 200,
    description: 'Canais do grupo do cliente',
    schema: {
      example: {
        linked: true,
        groupId: 'clx9f2k1a0001abcd',
        groupName: 'Padaria do Zé',
        channels: [
          {
            id: 'int-1',
            name: '@padariadoze',
            provider: 'instagram',
            disabled: false,
            groupId: 'clx9f2k1a0001abcd',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  @ApiResponse({ status: 503, description: 'Motor de publicação não configurado' })
  async listChannels(@Param('customerId') customerId: string) {
    const result = await this.channels.execute({ customerId })

    if (result.isLeft()) throw toHttpError(result.value)

    return result.value
  }
}


// ── Publicação ───────────────────────────────────────────────────────────────

class PublishSocialPostDto {
  @ApiProperty({
    example: 'Encomende sua peça pelo WhatsApp. [ref: K7MQ2A]',
    description:
      'Texto do post. Passa pelas regras da casa antes de ir ao motor; reprovação responde 422 com as violações.',
  })
  content!: string

  @ApiProperty({
    example: ['int-instagram-1', 'int-facebook-1'],
    description:
      'Canais de destino, de GET /customers/:id/social/channels. Vários numa chamada só espelham o post entre redes.',
    type: [String],
  })
  channelIds!: string[]

  @ApiProperty({
    example: 'schedule',
    enum: ['now', 'schedule'],
    description: '"now" publica já; "schedule" guarda para a data.',
  })
  mode!: 'now' | 'schedule'

  @ApiPropertyOptional({
    example: '2026-09-20T13:00:00.000Z',
    description: 'ISO 8601. Obrigatório em "schedule" e precisa ser futuro.',
  })
  scheduledFor?: string

  @ApiPropertyOptional({
    example: '2f6c…',
    description: 'Link rastreável que viajou no texto, para cruzar conversa com post.',
  })
  attributionLinkId?: string

  @ApiPropertyOptional({ example: 'creative-1', description: 'Criativo que originou o post.' })
  creativeId?: string
}

class PublishBatchDto {
  @ApiProperty({
    type: [PublishSocialPostDto],
    description:
      'Os posts do calendário, na ordem. Cada um é conferido e publicado por conta própria.',
  })
  posts!: PublishSocialPostDto[]
}

@ApiTags('Social')
@ApiBearerAuth()
@Controller('customers/:customerId/social/publications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class SocialPublicationsController {
  constructor(
    private readonly publish: PublishSocialPostUseCase,
    private readonly list: ListSocialPublicationsUseCase,
    private readonly batch: PublishSocialPostsBatchUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Publicar ou agendar um post nas redes do cliente',
    description:
      'A decisão é tomada aqui e o motor (Postiz) só executa. A ordem é deliberada: o texto passa pelas regras da casa ANTES de chegar ao motor — validar depois seria validar o que já saiu. O agendamento vive no motor porque a API do Instagram não agenda (media_publish não aceita data futura). Publicar em vários canais numa chamada só é o que espelha o post entre redes. Devolve um id de post por canal, que é o caminho de volta das métricas.',
  })
  @ApiParam({ name: 'customerId', description: 'Cliente dono das contas' })
  @ApiBody({ type: PublishSocialPostDto })
  @ApiResponse({
    status: 201,
    description: 'Publicação registrada e entregue ao motor',
    schema: {
      example: {
        publicationId: '9c3a…',
        scheduledFor: '2026-09-20T13:00:00.000Z',
        targets: [
          { channelId: 'int-instagram-1', provider: 'instagram', postizPostId: 'ckp1…' },
          { channelId: 'int-facebook-1', provider: 'facebook', postizPostId: 'ckp2…' },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Canal indisponível ou data de agendamento inválida' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Cliente ainda não ligado a um grupo, ou criativo sem arquivo enviado',
  })
  @ApiResponse({
    status: 415,
    description: 'Formato do criativo não aceito nas redes (use PNG, JPEG, GIF, WEBP ou MP4)',
  })
  @ApiResponse({
    status: 422,
    description: 'Texto fere as regras editoriais; o corpo traz as violações com trecho e posição',
  })
  @ApiResponse({ status: 503, description: 'Motor de publicação não configurado' })
  async create(
    @Param('customerId') customerId: string,
    @Body() body: PublishSocialPostDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.publish.execute({
      customerId,
      content: body.content,
      channelIds: body.channelIds ?? [],
      mode: body.mode,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      attributionLinkId: body.attributionLinkId ?? null,
      creativeId: body.creativeId ?? null,
      createdByUserId: user.userId,
    })

    if (result.isLeft()) throw toHttpError(result.value)

    return result.value
  }

  @Post('batch')
  @ApiOperation({
    summary: 'Agendar o calendário editorial de uma vez',
    description:
      'O mês tem cerca de 32 publicações; cadastrar uma a uma é trabalho suficiente para a pessoa desistir e voltar ao Business Suite. Como agentes operam este sistema, montar o mês inteiro numa chamada é o caso de uso real. UM ITEM RUIM NÃO DERRUBA O LOTE: cada post passa pelas regras da casa por conta própria, e a resposta diz item a item, pela posição enviada, o que entrou e o que não entrou. Publica em série de propósito — o motor aceita 90 requisições por hora, e disparar tudo de uma vez trocaria um lote lento por um lote recusado pela metade. Por isso também o teto de 40 posts por lote.',
  })
  @ApiParam({ name: 'customerId', description: 'Cliente dono das contas' })
  @ApiBody({ type: PublishBatchDto })
  @ApiResponse({
    status: 201,
    description: 'Resultado item a item',
    schema: {
      example: {
        total: 3,
        scheduled: 2,
        rejected: 1,
        results: [
          {
            index: 0,
            status: 'scheduled',
            publicationId: '9c3a…',
            scheduledFor: '2026-09-20T13:00:00.000Z',
            targets: [
              { channelId: 'int-instagram-1', provider: 'instagram', postizPostId: 'ckp1…' },
            ],
          },
          {
            index: 1,
            status: 'rejected',
            error: 'O texto fere as regras editoriais da casa.',
            violations: [
              {
                ruleId: 'em-dash',
                severity: 'block',
                message: 'Travessão não é usado nos textos da casa.',
                excerpt: 'Pão quentinho — a partir de R$ 5',
                index: 14,
              },
            ],
          },
          { index: 2, status: 'scheduled', publicationId: '4f1b…' },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Lote vazio ou acima do limite de 40 posts' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async createBatch(
    @Param('customerId') customerId: string,
    @Body() body: PublishBatchDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.batch.execute({
      customerId,
      items: (body.posts ?? []).map((post) => ({
        content: post.content,
        channelIds: post.channelIds ?? [],
        mode: post.mode,
        scheduledFor: post.scheduledFor ? new Date(post.scheduledFor) : undefined,
        attributionLinkId: post.attributionLinkId ?? null,
        creativeId: post.creativeId ?? null,
      })),
      createdByUserId: user.userId,
    })

    if (result.isLeft()) throw toHttpError(result.value)

    return result.value
  }

  @Get()
  @ApiOperation({
    summary: 'Publicações que este cliente mandou publicar',
    description:
      'A decisão registrada deste lado, com o id de post de cada canal. Não substitui a fila do motor: serve para reencontrar a publicação quando a métrica chega falando em id de post.',
  })
  @ApiParam({ name: 'customerId', description: 'Cliente' })
  @ApiResponse({
    status: 200,
    description: 'Publicações do cliente',
    schema: {
      example: {
        publications: [
          {
            id: '9c3a…',
            customerId: '7b1e…',
            postizGroupId: 'clx9f2k1a0001abcd',
            content: 'Encomende sua peça pelo WhatsApp. [ref: K7MQ2A]',
            mode: 'schedule',
            scheduledFor: '2026-09-20T13:00:00.000Z',
            attributionLinkId: '2f6c…',
            creativeId: null,
            createdByUserId: 'user-1',
            createdAt: '2026-09-13T12:00:00.000Z',
            targets: [
              { channelId: 'int-instagram-1', provider: 'instagram', postizPostId: 'ckp1…' },
            ],
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async listAll(@Param('customerId') customerId: string) {
    const result = await this.list.execute({ customerId })

    if (result.isLeft()) throw toHttpError(result.value)

    return result.value
  }
}


// ── Fila do motor ────────────────────────────────────────────────────────────

@ApiTags('Social')
@ApiBearerAuth()
@Controller('customers/:customerId/social/queue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class SocialQueueController {
  constructor(
    private readonly queue: GetSocialQueueUseCase,
    private readonly cancel: CancelSocialPostUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'O que está na fila deste cliente',
    description:
      'Lê a fila direto do motor, filtrada pelo grupo do cliente, e devolve em ordem cronológica. Mostra também o que foi criado direto no Postiz, que é o ponto: sem isto seria preciso abrir o motor para saber o que vai sair. A janela padrão é o mês à frente, que é o horizonte do plano editorial.',
  })
  @ApiParam({ name: 'customerId', description: 'Cliente' })
  @ApiQuery({ name: 'from', required: false, description: 'Início da janela, ISO 8601. Padrão: hoje.' })
  @ApiQuery({ name: 'to', required: false, description: 'Fim da janela, ISO 8601. Padrão: 30 dias à frente.' })
  @ApiResponse({
    status: 200,
    description: 'Fila do cliente',
    schema: {
      example: {
        from: '2026-09-13T00:00:00.000Z',
        to: '2026-10-13T00:00:00.000Z',
        posts: [
          {
            id: 'ckp1…',
            content: 'Encomende sua peça pelo WhatsApp.',
            publishAt: '2026-09-20T13:00:00.000Z',
            state: 'QUEUE',
            url: null,
            channelId: 'int-instagram-1',
            channelName: '@padariadoze',
            provider: 'instagram',
            group: 'grp-1',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Janela inválida' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  @ApiResponse({ status: 409, description: 'Cliente ainda não ligado a um grupo do motor' })
  @ApiResponse({ status: 503, description: 'Motor de publicação não configurado' })
  async list(
    @Param('customerId') customerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = await this.queue.execute({
      customerId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    })

    if (result.isLeft()) throw toHttpError(result.value)

    return result.value
  }

  @Delete(':postId')
  @ApiOperation({
    summary: 'Cancelar um post da fila',
    description:
      'Apaga o post no motor. Irreversível, e atinge TODAS as redes em que ele foi espelhado — o motor resolve o grupo a partir do id e remove o grupo inteiro. Antes de apagar, confere que o post pertence ao grupo deste cliente: o motor aceitaria o id sozinho e apagaria post de qualquer cliente da organização.',
  })
  @ApiParam({ name: 'customerId', description: 'Cliente dono da fila' })
  @ApiParam({ name: 'postId', description: 'Id do post no motor' })
  @ApiResponse({ status: 200, description: 'Post cancelado', schema: { example: { postId: 'ckp1…' } } })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado, ou post fora da fila deste cliente' })
  @ApiResponse({ status: 409, description: 'Cliente ainda não ligado a um grupo do motor' })
  @ApiResponse({ status: 503, description: 'Motor de publicação não configurado' })
  async remove(
    @Param('customerId') customerId: string,
    @Param('postId') postId: string,
  ) {
    const result = await this.cancel.execute({ customerId, postId })

    if (result.isLeft()) throw toHttpError(result.value)

    return result.value
  }
}


// ── Feed e resultado ─────────────────────────────────────────────────────────

@ApiTags('Social')
@ApiBearerAuth()
@Controller('customers/:customerId/social/feed')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class SocialFeedController {
  constructor(private readonly feed: GetSocialFeedUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'O que já foi publicado para este cliente',
    description:
      'A agenda olhando para trás. Traz só o que saiu — publicado ou falhado —, do mais recente para o mais antigo; rascunho e post ainda na fila pertencem à agenda. Falha entra junto com sucesso de propósito: um post que não saiu é a notícia mais importante aqui, e escondê-lo faria o silêncio parecer sucesso. Métricas não vêm nesta resposta: são uma chamada por post, sob demanda, porque a API do motor tem teto de 90 requisições por hora.',
  })
  @ApiParam({ name: 'customerId', description: 'Cliente' })
  @ApiQuery({ name: 'from', required: false, description: 'Início da janela, ISO 8601. Padrão: 30 dias atrás.' })
  @ApiQuery({ name: 'to', required: false, description: 'Fim da janela, ISO 8601. Padrão: agora.' })
  @ApiResponse({
    status: 200,
    description: 'Publicações do período',
    schema: {
      example: {
        from: '2026-08-14T12:00:00.000Z',
        to: '2026-09-13T12:00:00.000Z',
        posts: [
          {
            id: 'ckp1…',
            content: 'Encomende sua peça pelo WhatsApp.',
            publishAt: '2026-09-12T13:00:00.000Z',
            state: 'PUBLISHED',
            url: 'https://www.instagram.com/p/abc123/',
            channelId: 'int-instagram-1',
            channelName: '@padariadoze',
            provider: 'instagram',
            group: 'grp-1',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Janela inválida' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  @ApiResponse({ status: 409, description: 'Cliente ainda não ligado a um grupo do motor' })
  @ApiResponse({ status: 503, description: 'Motor de publicação não configurado' })
  async list(
    @Param('customerId') customerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = await this.feed.execute({
      customerId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    })

    if (result.isLeft()) throw toHttpError(result.value)

    return result.value
  }
}

@ApiTags('Social')
@ApiBearerAuth()
@Controller('customers/:customerId/social/posts/:postId/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class SocialPostMetricsController {
  constructor(private readonly metrics: GetPostMetricsUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Como este post se saiu na rede',
    description:
      'Uma chamada por post, sob demanda. O teto da API pública do motor é de 90 requisições por hora, então buscar a métrica de um mês inteiro a cada abertura do feed queimaria o teto sozinha — ingestão em lote é outro assunto (#1554). Responde available=false quando não há o que mostrar: post que não chegou a publicar, ou rede que não expõe métrica por post. Ausência de dado não é zero.',
  })
  @ApiParam({ name: 'customerId', description: 'Cliente dono do post' })
  @ApiParam({ name: 'postId', description: 'Id do post no motor' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Janela em dias (padrão 30).' })
  @ApiResponse({
    status: 200,
    description: 'Métricas do post',
    schema: {
      example: {
        available: true,
        metrics: [
          { label: 'Reach', total: 1240, percentageChange: 12 },
          { label: 'Likes', total: 87, percentageChange: -3 },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado, ou post fora da fila deste cliente' })
  @ApiResponse({ status: 409, description: 'Cliente ainda não ligado a um grupo do motor' })
  @ApiResponse({ status: 503, description: 'Motor de publicação não configurado' })
  async get(
    @Param('customerId') customerId: string,
    @Param('postId') postId: string,
    @Query('days') days?: string,
  ) {
    const result = await this.metrics.execute({
      customerId,
      postId,
      days: days ? Number(days) : undefined,
    })

    if (result.isLeft()) throw toHttpError(result.value)

    return result.value
  }
}


@ApiTags('Social')
@ApiBearerAuth()
@Controller('customers/:customerId/social/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class SocialStoredMetricsController {
  constructor(private readonly metrics: ListSocialPostMetricsUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Números já coletados dos posts deste cliente',
    description:
      'Lê do nosso banco, não do motor — é o que permite montar comparação e série sem gastar as 90 requisições por hora que o motor concede. A coleta roda de madrugada e recolhe os últimos sete dias, porque algumas métricas demoram a estabilizar. Campo nulo significa que a rede não informou aquela métrica, o que é diferente de zero: o Instagram dá salvamento e alcance, o LinkedIn não.',
  })
  @ApiParam({ name: 'customerId', description: 'Cliente' })
  @ApiResponse({
    status: 200,
    description: 'Métricas guardadas',
    schema: {
      example: {
        metrics: [
          {
            postizPostId: 'ckp1…',
            customerId: '7b1e…',
            provider: 'instagram',
            views: 3400,
            reach: 2870,
            likes: 154,
            comments: 12,
            shares: 8,
            saves: 21,
            collectedAt: '2026-09-14T07:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async list(@Param('customerId') customerId: string) {
    const result = await this.metrics.execute({ customerId })

    if (result.isLeft()) throw toHttpError(result.value)

    return result.value
  }
}
