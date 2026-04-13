import { ICustomerFolderService } from '@/domain/customers/application/services/i-customer-folder.service'

export class FakeCustomerFolderService implements ICustomerFolderService {
  public createdFolders: { name: string; folderId: string }[] = []

  async createFolder(customerName: string): Promise<string> {
    const folderId = `fake-folder-${customerName.toLowerCase().replace(/\s+/g, '-')}`
    this.createdFolders.push({ name: customerName, folderId })
    return folderId
  }
}
