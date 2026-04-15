import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CurrentUser } from '@/infra/auth/decorators/current-user.decorator'
import { CreateCreativeUseCase } from '@/domain/creatives/application/use-cases/create-creative.use-case'
import { UploadCreativeFileUseCase } from '@/domain/creatives/application/use-cases/upload-creative-file.use-case'
import { GetCreativeUseCase } from '@/domain/creatives/application/use-cases/get-creative.use-case'
import { ListCreativesUseCase } from '@/domain/creatives/application/use-cases/list-creatives.use-case'
import { UpdateCreativeUseCase } from '@/domain/creatives/application/use-cases/update-creative.use-case'
import { DeleteCreativeUseCase } from '@/domain/creatives/application/use-cases/delete-creative.use-case'
import { AddCreativePerformanceUseCase } from '@/domain/creatives/application/use-cases/add-creative-performance.use-case'
import { ICreativePerformanceRepository } from '@/domain/creatives/application/repositories/i-creative-performance.repository'
import { Creative } from '@/domain/creatives/enterprise/entities/creative'

// ── DTOs ─────────────────────────────────────────────────────────────────────

class CreateCreativeDto {
  @ApiProperty({ example: 'Anúncio de lançamento' }) title!: string
  @ApiProperty({ enum: ['image', 'video', 'carousel'] }) type!: string
  @ApiPropertyOptional({ example: 'Conheça nosso produto' }) caption?: string
  @ApiPropertyOptional({ example: 'Fundo branco, produto centralizado' }) designDescription?: string
  @ApiPropertyOptional({ enum: ['awareness', 'traffic', 'engagement', 'leads', 'sales', 'retargeting'] }) objective?: string
}

class UpdateCreativeDto {
  @ApiPropertyOptional() title?: string
  @ApiPropertyOptional() caption?: string | null
  @ApiPropertyOptional() designDescription?: string | null
  @ApiPropertyOptional({ enum: ['awareness', 'traffic', 'engagement', 'leads', 'sales', 'retargeting'] }) objective?: string | null
  @ApiPropertyOptional({ enum: ['draft', 'active', 'paused', 'archived'] }) status?: string
}

class AddPerformanceDto {
  @ApiProperty({ example: 'facebook' }) platform!: string
  @ApiPropertyOptional({ example: 'camp-123' }) campaignId?: string
  @ApiProperty({ example: 10000 }) impressions!: number
  @ApiProperty({ example: 320 }) clicks!: number
  @ApiProperty({ example: 15 }) conversions!: number
  @ApiProperty({ example: 250.00 }) spend!: number
  @ApiPropertyOptional({ example: 3.2, description: 'CTR %' }) ctr?: number
  @ApiPropertyOptional({ example: 0.78 }) cpc?: number
  @ApiPropertyOptional({ example: 16.67 }) cpa?: number
  @ApiPropertyOptional({ example: 4.5 }) roas?: number
  @ApiProperty({ example: '2026-04-01' }) startDate!: string
  @ApiPropertyOptional({ example: '2026-04-05' }) endDate?: string
  @ApiPropertyOptional() notes?: string
}

// ── Serializer ────────────────────────────────────────────────────────────────

function toHttp(c: Creative) {
  return {
    id: c.id.value,
    customerId: c.customerId,
    title: c.title,
    caption: c.caption,
    designDescription: c.designDescription,
    type: c.type,
    objective: c.objective,
    status: c.status,
    driveFileId: c.driveFileId,
    driveViewUrl: c.driveViewUrl,
    driveDownloadUrl: c.driveDownloadUrl,
    thumbnailUrl: c.thumbnailUrl,
    mimeType: c.mimeType,
    sizeBytes: c.sizeBytes?.toString() ?? null,
    createdByUserId: c.createdByUserId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

@ApiTags('Creatives')
@ApiBearerAuth()
@Controller('customers/:customerId/creatives')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class CreativesController {
  constructor(
    private readonly createCreative: CreateCreativeUseCase,
    private readonly uploadFile: UploadCreativeFileUseCase,
    private readonly getCreative: GetCreativeUseCase,
    private readonly listCreatives: ListCreativesUseCase,
    private readonly updateCreative: UpdateCreativeUseCase,
    private readonly deleteCreative: DeleteCreativeUseCase,
    private readonly addPerformance: AddCreativePerformanceUseCase,
    private readonly performanceRepo: ICreativePerformanceRepository,
  ) {}

  // ── CREATE ──────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a creative (metadata only — upload file separately)' })
  @ApiParam({ name: 'customerId' })
  @ApiBody({ type: CreateCreativeDto })
  @ApiResponse({ status: 201, description: 'Creative created' })
  @ApiResponse({ status: 400, description: 'Invalid type or objective' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async create(
    @Param('customerId') customerId: string,
    @Body() body: CreateCreativeDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.createCreative.execute({
      customerId,
      title: body.title,
      type: body.type,
      caption: body.caption,
      designDescription: body.designDescription,
      objective: body.objective,
      createdByUserId: user.userId,
    })

    if (result.isLeft()) throw new BadRequestException(result.value.message)
    return { creativeId: result.value.creativeId }
  }

  // ── UPLOAD FILE ─────────────────────────────────────────────────────────────

  @Post(':creativeId/file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload creative file to Google Drive' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'creativeId' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded' })
  @ApiResponse({ status: 404, description: 'Creative not found' })
  async uploadCreativeFile(
    @Param('customerId') customerId: string,
    @Param('creativeId') creativeId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { userId: string },
  ) {
    if (!file) throw new BadRequestException('File is required')

    const result = await this.uploadFile.execute({
      customerId,
      creativeId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      buffer: file.buffer,
      uploadedByUserId: user.userId,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return result.value
  }

  // ── LIST ────────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List creatives for a customer' })
  @ApiParam({ name: 'customerId' })
  @ApiQuery({ name: 'type', required: false, enum: ['image', 'video', 'carousel'] })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'active', 'paused', 'archived'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of creatives' })
  async list(
    @Param('customerId') customerId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.listCreatives.execute({
      customerId,
      type,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })

    if (result.isLeft()) throw new BadRequestException()
    return { items: result.value.items.map(toHttp), total: result.value.total }
  }

  // ── GET ─────────────────────────────────────────────────────────────────────

  @Get(':creativeId')
  @ApiOperation({ summary: 'Get a single creative' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'creativeId' })
  @ApiResponse({ status: 200, description: 'Creative details' })
  @ApiResponse({ status: 404, description: 'Creative not found' })
  async get(
    @Param('customerId') customerId: string,
    @Param('creativeId') creativeId: string,
  ) {
    const result = await this.getCreative.execute({ customerId, creativeId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return toHttp(result.value.creative)
  }

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  @Patch(':creativeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update creative metadata or status' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'creativeId' })
  @ApiBody({ type: UpdateCreativeDto })
  @ApiResponse({ status: 204, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(
    @Param('customerId') customerId: string,
    @Param('creativeId') creativeId: string,
    @Body() body: UpdateCreativeDto,
  ) {
    const result = await this.updateCreative.execute({ customerId, creativeId, ...body })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  // ── DELETE ──────────────────────────────────────────────────────────────────

  @Delete(':creativeId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a creative (admin only)' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'creativeId' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async delete(
    @Param('customerId') customerId: string,
    @Param('creativeId') creativeId: string,
  ) {
    const result = await this.deleteCreative.execute({ customerId, creativeId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  // ── PERFORMANCE ──────────────────────────────────────────────────────────────

  @Post(':creativeId/performances')
  @ApiOperation({ summary: 'Record performance metrics for a creative' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'creativeId' })
  @ApiBody({ type: AddPerformanceDto })
  @ApiResponse({ status: 201, description: 'Performance recorded' })
  @ApiResponse({ status: 404, description: 'Creative not found' })
  async addPerformanceRecord(
    @Param('customerId') customerId: string,
    @Param('creativeId') creativeId: string,
    @Body() body: AddPerformanceDto,
  ) {
    const result = await this.addPerformance.execute({
      customerId,
      creativeId,
      platform: body.platform,
      campaignId: body.campaignId,
      impressions: body.impressions,
      clicks: body.clicks,
      conversions: body.conversions,
      spend: body.spend,
      ctr: body.ctr,
      cpc: body.cpc,
      cpa: body.cpa,
      roas: body.roas,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      notes: body.notes,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return { performanceId: result.value.performanceId }
  }

  @Get(':creativeId/performances')
  @ApiOperation({ summary: 'List performance records for a creative' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'creativeId' })
  @ApiResponse({ status: 200, description: 'Performance records' })
  async listPerformances(
    @Param('creativeId') creativeId: string,
  ) {
    const items = await this.performanceRepo.findByCreativeId(creativeId)
    return { items }
  }
}
