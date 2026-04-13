export abstract class ICustomerFolderService {
  abstract createFolder(customerName: string): Promise<string> // returns folderId
}
