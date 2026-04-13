import { Module } from '@nestjs/common'
import { DocumentsController } from '@/infra/controllers/documents.controller'
import { UploadDocumentUseCase } from '@/domain/documents/application/use-cases/upload-document.use-case'
import { GetDocumentUseCase } from '@/domain/documents/application/use-cases/get-document.use-case'
import { ListCustomerDocumentsUseCase } from '@/domain/documents/application/use-cases/list-customer-documents.use-case'
import { UpdateDocumentStatusUseCase } from '@/domain/documents/application/use-cases/update-document-status.use-case'
import { DeleteDocumentUseCase } from '@/domain/documents/application/use-cases/delete-document.use-case'

@Module({
  controllers: [DocumentsController],
  providers: [
    UploadDocumentUseCase,
    GetDocumentUseCase,
    ListCustomerDocumentsUseCase,
    UpdateDocumentStatusUseCase,
    DeleteDocumentUseCase,
  ],
})
export class DocumentsModule {}
