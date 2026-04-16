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

// ── DTOs ─────────────────────────────────────────────────────────────────────

class SaveMetaConfigDto {
  @ApiProperty({ example: '123456789' }) appId!: string
  @ApiProperty({ example: 'abc123secret' }) appSecret!: string
  @ApiProperty({ example: 'EAAxxxxxxx' }) systemUserToken!: string
  @ApiProperty({ example: '987654321', description: 'Business Manager ID' }) bmId!: string
}

class UpdateMetaConfigDto {
  @ApiPropertyOptional({ example: '123456789' }) appId?: string
  @ApiPropertyOptional({ example: 'abc123secret' }) appSecret?: string
  @ApiPropertyOptional({ example: 'EAAxxxxxxx' }) systemUserToken?: string
  @ApiPropertyOptional({ example: '987654321' }) bmId?: string
}

// ── Serializer ────────────────────────────────────────────────────────────────

function toHttp(config: { appId: string; bmId: string; updatedAt: Date; createdAt: Date }) {
  return {
    appId: config.appId,
    bmId: config.bmId,
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
    })
  }
}
