import { getPrisma } from '../lib/prisma.js';
import {
  UserRepository,
  WorkflowRepository,
  ConversationRepository,
  ExportHistoryRepository,
} from '../repositories/index.js';

class DatabaseService {
  private _user!: UserRepository;
  private _workflow!: WorkflowRepository;
  private _conversation!: ConversationRepository;
  private _exportHistory!: ExportHistoryRepository;

  get user(): UserRepository {
    if (!this._user) this._user = new UserRepository(getPrisma());
    return this._user;
  }

  get workflow(): WorkflowRepository {
    if (!this._workflow) this._workflow = new WorkflowRepository(getPrisma());
    return this._workflow;
  }

  get conversation(): ConversationRepository {
    if (!this._conversation) this._conversation = new ConversationRepository(getPrisma());
    return this._conversation;
  }

  get exportHistory(): ExportHistoryRepository {
    if (!this._exportHistory) this._exportHistory = new ExportHistoryRepository(getPrisma());
    return this._exportHistory;
  }
}

export const db = new DatabaseService();
