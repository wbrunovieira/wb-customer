import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Request as ExpressRequest } from 'express'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { UploadDocumentUseCase } from '@/domain/documents/application/use-cases/upload-document.use-case'
import { GetDocumentUseCase } from '@/domain/documents/application/use-cases/get-document.use-case'
import { ListCustomerDocumentsUseCase } from '@/domain/documents/application/use-cases/list-customer-documents.use-case'
import { UpdateDocumentStatusUseCase } from '@/domain/documents/application/use-cases/update-document-status.use-case'
import { DeleteDocumentUseCase } from '@/domain/documents/application/use-cases/delete-document.use-case'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { DocumentNotFoundError } from '@/domain/documents/domain/exceptions/document-not-found.error'
import { InvalidDocumentTypeError } from '@/domain/documents/domain/exceptions/invalid-document-type.error'
import { InvalidDocumentStatusError } from '@/domain/documents/domain/exceptions/invalid-document-status.error'

interface AuthenticatedRequest extends ExpressRequest {
  user: { userId: string; role: string }
}

class UpdateDocumentStatusDto {
  @ApiProperty({
    example: 'signed',
    enum: ['pending_signature', 'signed', 'expired', 'cancelled'],
  })
  status!: string
}

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('customers/:customerId/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(
    private readonly uploadDocument: UploadDocumentUseCase,
    private readonly getDocument: GetDocumentUseCase,
    private readonly listDocuments: ListCustomerDocumentsUseCase,
    private readonly updateStatus: UpdateDocumentStatusUseCase,
    private readonly deleteDocument: DeleteDocumentUseCase,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a document for a customer' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type', 'title'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: ['proposal', 'contract', 'addendum', 'other'] },
        title: { type: 'string', example: 'Q1 Proposal' },
        notes: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded', schema: { example: { documentId: 'uuid' } } })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 400, description: 'Invalid document type or no file provided' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async upload(
    @Param('customerId') customerId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Body('title') title: string,
    @Body('notes') notes: string | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!file) throw new BadRequestException('File is required')

    const result = await this.uploadDocument.execute({
      customerId,
      type,
      title,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      notes,
      uploadedByUserId: req.user.userId,
      buffer: file.buffer,
    })

    if (result.isLeft()) {
      const error = result.value
      if (error instanceof CustomerNotFoundError) throw new NotFoundException(error.message)
      if (error instanceof InvalidDocumentTypeError) throw new BadRequestException(error.message)
      throw new BadRequestException()
    }

    return { documentId: result.value.documentId }
  }

  @Get()
  @ApiOperation({ summary: 'List documents for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiQuery({ name: 'type', required: false, enum: ['proposal', 'contract', 'addendum', 'other'] })
  @ApiQuery({ name: 'status', required: false, enum: ['pending_signature', 'signed', 'expired', 'cancelled'] })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated list of documents' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(
    @Param('customerId') customerId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.listDocuments.execute({
      customerId,
      type,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)

    const { items, total } = result.value
    return {
      items: items.map((d) => ({
        id: d.id.value,
        type: d.type.value,
        title: d.title,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        status: d.status.value,
        driveViewUrl: d.driveViewUrl,
        driveDownloadUrl: d.driveDownloadUrl,
        signedAt: d.signedAt,
        notes: d.notes,
        uploadedByUserId: d.uploadedByUserId,
        createdAt: d.createdAt,
      })),
      total,
    }
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get a single document' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document details' })
  @ApiResponse({ status: 404, description: 'Document or customer not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async get(
    @Param('customerId') customerId: string,
    @Param('documentId') documentId: string,
  ) {
    const result = await this.getDocument.execute({ customerId, documentId })

    if (result.isLeft()) throw new NotFoundException(result.value.message)

    const { document } = result.value
    return {
      id: document.id.value,
      type: document.type.value,
      title: document.title,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      status: document.status.value,
      driveViewUrl: document.driveViewUrl,
      driveDownloadUrl: document.driveDownloadUrl,
      signedAt: document.signedAt,
      notes: document.notes,
      uploadedByUserId: document.uploadedByUserId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    }
  }

  @Patch(':documentId/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update document status' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiBody({ type: UpdateDocumentStatusDto })
  @ApiResponse({ status: 204, description: 'Status updated' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 400, description: 'Invalid status value' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async patchStatus(
    @Param('customerId') customerId: string,
    @Param('documentId') documentId: string,
    @Body() body: UpdateDocumentStatusDto,
  ) {
    const result = await this.updateStatus.execute({ customerId, documentId, status: body.status })

    if (result.isLeft()) {
      const error = result.value
      if (error instanceof DocumentNotFoundError) throw new NotFoundException(error.message)
      if (error instanceof InvalidDocumentStatusError) throw new BadRequestException(error.message)
      throw new BadRequestException()
    }
  }

  @Delete(':documentId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document and remove from storage (admin only)' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 204, description: 'Document deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async delete(
    @Param('customerId') customerId: string,
    @Param('documentId') documentId: string,
  ) {
    const result = await this.deleteDocument.execute({ customerId, documentId })

    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }
}
