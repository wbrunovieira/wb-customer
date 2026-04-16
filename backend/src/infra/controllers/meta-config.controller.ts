import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { SaveMetaConfigUseCase } from '@/domain/paid-traffic/application/use-cases/save-meta-config.use-case'
import { GetMetaConfigUseCase } from '@/domain/paid-traffic/application/use-cases/get-meta-config.use-case'
import { ListMetaAdAccountsUseCase } from '@/domain/paid-traffic/application/use-cases/list-meta-ad-accounts.use-case'

// ── DTOs ─────────────────────────────────────────────────────────────────────

class SaveMetaConfigDto {
  @ApiProperty({ example: '123456789' }) appId!: string
  @ApiProperty({ example: 'abc123secret' }) appSecret!: string
  @ApiProperty({ example: 'EAAxxxxxxx' }) systemUserToken!: string
  @ApiProperty({ example: '987654321', description: 'Business Manager ID' }) bmId!: string
  @ApiPropertyOptional({ example: 'act_123456789' }) ownAdAccountId?: string
  @ApiPropertyOptional({ example: 'Minha Conta de Anúncios' }) ownAdAccountName?: string
}

class UpdateMetaConfigDto {
  @ApiPropertyOptional({ example: '123456789' }) appId?: string
  @ApiPropertyOptional({ example: 'abc123secret' }) appSecret?: string
  @ApiPropertyOptional({ example: 'EAAxxxxxxx' }) systemUserToken?: string
  @ApiPropertyOptional({ example: '987654321' }) bmId?: string
  @ApiPropertyOptional({ example: 'act_123456789' }) ownAdAccountId?: string | null
  @ApiPropertyOptional({ example: 'Minha Conta de Anúncios' }) ownAdAccountName?: string | null
}

// ── Serializer ────────────────────────────────────────────────────────────────

function toHttp(config: { appId: string; bmId: string; ownAdAccountId?: string | null; ownAdAccountName?: string | null; updatedAt: Date; createdAt: Date }) {
  return {
    appId: config.appId,
    bmId: config.bmId,
    ownAdAccountId: config.ownAdAccountId ?? null,
    ownAdAccountName: config.ownAdAccountName ?? null,
    updatedAt: config.updatedAt,
    createdAt: config.createdAt,
  }
}

@ApiTags('Admin — Meta Config')
@ApiBearerAuth()
@Controller('admin/meta-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class MetaConfigController {
  constructor(
    private readonly saveMetaConfig: SaveMetaConfigUseCase,
    private readonly getMetaConfig: GetMetaConfigUseCase,
    private readonly listMetaAdAccounts: ListMetaAdAccountsUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create or overwrite Meta platform config (admin only)' })
  @ApiBody({ type: SaveMetaConfigDto })
  @ApiResponse({ status: 201, description: 'Config saved' })
  async save(@Body() body: SaveMetaConfigDto) {
    await this.saveMetaConfig.execute({
      appId: body.appId,
      appSecret: body.appSecret,
      systemUserToken: body.systemUserToken,
      bmId: body.bmId,
      ownAdAccountId: body.ownAdAccountId,
      ownAdAccountName: body.ownAdAccountName,
    })
    return { success: true }
  }

  @Get()
  @ApiOperation({ summary: 'Get current Meta platform config (admin only)' })
  @ApiResponse({ status: 200, description: 'Meta config' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  async get() {
    const result = await this.getMetaConfig.execute()
    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return toHttp(result.value.config)
  }

  @Get('ad-accounts')
  @ApiOperation({ summary: 'List ad accounts available in the BM (admin only)' })
  @ApiResponse({ status: 200, description: 'List of ad accounts linked to the BM' })
  @ApiResponse({ status: 404, description: 'Meta config not found' })
  async getAdAccounts() {
    const result = await this.listMetaAdAccounts.execute()
    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return { accounts: result.value.accounts }
  }

  @Patch()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update Meta platform config fields (admin only)' })
  @ApiBody({ type: UpdateMetaConfigDto })
  @ApiResponse({ status: 204, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  async update(@Body() body: UpdateMetaConfigDto) {
    const existing = await this.getMetaConfig.execute()
    if (existing.isLeft()) throw new NotFoundException(existing.value.message)

    await this.saveMetaConfig.execute({
      appId: body.appId ?? existing.value.config.appId,
      appSecret: body.appSecret ?? existing.value.config.appSecret,
      systemUserToken: body.systemUserToken ?? existing.value.config.systemUserToken,
      bmId: body.bmId ?? existing.value.config.bmId,
      ownAdAccountId: body.ownAdAccountId !== undefined ? body.ownAdAccountId : existing.value.config.ownAdAccountId,
      ownAdAccountName: body.ownAdAccountName !== undefined ? body.ownAdAccountName : existing.value.config.ownAdAccountName,
    })
  }
}
