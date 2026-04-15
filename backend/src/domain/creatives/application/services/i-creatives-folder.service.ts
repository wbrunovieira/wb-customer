export abstract class ICreativesFolderService {
  /** Returns Drive folder ID for the given customer, creating it if it doesn't exist */
  abstract getOrCreateFolder(customerName: string): Promise<string>
}
