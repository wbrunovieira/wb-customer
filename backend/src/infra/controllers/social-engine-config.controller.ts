import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  BadRequestException,
  ServiceUnavailableException,
  BadGatewayException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity,
  ApiProperty,
} from '@nestjs/swagger'
import { ApiKeyOrJwtGuard } from '@/infra/auth/guards/api-key-or-jwt.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { SaveSocialEngineConfigUseCase } from '@/domain/social/application/use-cases/save-social-engine-config.use-case'
import { GetSocialEngineConfigStatusUseCase } from '@/domain/social/application/use-cases/get-social-engine-config-status.use-case'
import { TestSocialEngineConfigUseCase } from '@/domain/social/application/use-cases/test-social-engine-config.use-case'
import { SocialEngineNotConfiguredError } from '@/domain/social/domain/exceptions/social-engine-not-configured.error'

// ── DTOs ─────────────────────────────────────────────────────────────────────

class SaveSocialEngineConfigDto {
  @ApiProperty({
    example: 'https://postiz.wbdigitalsolutions.com',
    description: 'Base do motor, sem /api/public/v1 — o adapter acrescenta.',
  })
  apiUrl!: string

  @ApiProperty({
    example: 'a1b2c3d4e5f6',
    description:
      'Chave do motor (Postiz → Settings). Vai no header Authorization cru, sem Bearer. Nunca é devolvida por nenhuma rota.',
  })
  apiKey!: string
}

class SocialEngineConfigStatusDto {
  @ApiProperty({ description: 'Estado efetivo, já considerando o fallback de .env.' })
  configured!: boolean

  @ApiProperty({ description: 'true quando veio do banco, cadastrado por esta API.' })
  storedInDatabase!: boolean

  @ApiProperty({ nullable: true, example: 'https://postiz.wbdigitalsolutions.com' })
  apiUrl!: string | null

  @ApiProperty({
    nullable: true,
    example: '9f86d081',
    description:
      'Primeiros 8 hex do sha256 da chave. Serve para conferir QUAL chave está carregada sem revelar nenhuma.',
  })
  keyFingerprint!: string | null

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  updatedAt!: Date | null
}

class TestSocialEngineConfigDto {
  @ApiProperty({ example: true })
  ok!: boolean

  @ApiProperty({ example: 3, description: 'Grupos que o motor respondeu — prova que a chave autenticou.' })
  groups!: number
}

// ── Controller ───────────────────────────────────────────────────────────────

/**
 * Cadastro das credenciais do motor de publicação.
 *
 * Existe para que um agente consiga configurar o sistema pela API, em vez de
 * precisar de SSH em produção — acesso que nenhum agente deve ter. Por isso
 * aceita principal de máquina (`x-api-key`) além do JWT de pessoa.
 *
 * A chave entra e nunca sai: GET devolve uma digital, não o segredo.
 */
@ApiTags('Admin — Social Engine Config')
@ApiBearerAuth()
@ApiSecurity('x-api-key')
@Controller('admin/social-engine')
@UseGuards(ApiKeyOrJwtGuard, RolesGuard)
@Roles('admin', 'agent')
export class SocialEngineConfigController {
  constructor(
    private readonly saveConfig: SaveSocialEngineConfigUseCase,
    private readonly getStatus: GetSocialEngineConfigStatusUseCase,
    private readonly testConfig: TestSocialEngineConfigUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Cadastrar ou substituir as credenciais do motor de publicação',
    description:
      'Grava no banco e passa a valer na hora, sem deploy. O valor no banco tem precedência sobre POSTIZ_API_URL/POSTIZ_API_KEY do ambiente.',
  })
  @ApiBody({ type: SaveSocialEngineConfigDto })
  @ApiResponse({ status: 201, description: 'Credenciais gravadas', schema: { example: { success: true } } })
  @ApiResponse({ status: 400, description: 'URL inválida, chave vazia ou chave com espaços' })
  @ApiResponse({ status: 401, description: 'Sem JWT válido nem x-api-key' })
  @ApiResponse({ status: 403, description: 'Principal sem papel admin ou agent' })
  async save(@Body() body: SaveSocialEngineConfigDto) {
    const result = await this.saveConfig.execute({
      apiUrl: body.apiUrl,
      apiKey: body.apiKey,
    })

    if (result.isLeft()) throw new BadRequestException(result.value.message)

    return { success: true }
  }

  @Get()
  @ApiOperation({
    summary: 'Estado da configuração do motor',
    description:
      'Nunca devolve a chave. Para conferir qual chave está carregada, compare o keyFingerprint.',
  })
  @ApiResponse({ status: 200, description: 'Estado atual', type: SocialEngineConfigStatusDto })
  @ApiResponse({ status: 401, description: 'Sem JWT válido nem x-api-key' })
  async status(): Promise<SocialEngineConfigStatusDto> {
    const result = await this.getStatus.execute()
    return result.value
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Testar as credenciais contra o motor',
    description:
      'Lista os grupos no motor para provar que a chave autentica. Custa 1 das 90 requisições/hora — é ação explícita, nunca chamada no carregamento de tela.',
  })
  @ApiResponse({ status: 200, description: 'Credenciais funcionam', type: TestSocialEngineConfigDto })
  @ApiResponse({ status: 502, description: 'O motor recusou a chave ou não respondeu' })
  @ApiResponse({ status: 503, description: 'Motor ainda não configurado' })
  async test(): Promise<TestSocialEngineConfigDto> {
    const result = await this.testConfig.execute()

    if (result.isLeft()) {
      if (result.value instanceof SocialEngineNotConfiguredError) {
        throw new ServiceUnavailableException(result.value.message)
      }
      throw new BadGatewayException(result.value.message)
    }

    return result.value
  }
}
