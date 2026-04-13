import { Injectable } from '@nestjs/common'
import { ICustomerFolderService } from '@/domain/customers/application/services/i-customer-folder.service'
import { randomUUID } from 'crypto'

@Injectable()
export class LocalCustomerFolderService implements ICustomerFolderService {
  async createFolder(customerName: string): Promise<string> {
    // In development/test: return a fake folder ID
    const slug = customerName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    return `local-folder-${slug}-${randomUUID().slice(0, 8)}`
  }
}
