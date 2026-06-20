import { normalizeWord } from './wordbank/mappers';
import { removeVocabulary, saveVocabulary } from './wordbank/crud';
import { listSavedVocabulary } from './wordbank/list';
import {
  createVocabularyList,
  deleteVocabularyList,
  listVocabularyLists,
  updateSavedVocabularyItems,
  updateVocabularyList,
} from './wordbank/lists';
import {
  checkReviewSessionAnswer,
  createReviewSession,
  submitReviewSession,
} from './wordbank/review';

export { getNextReviewDate } from './wordbank/scheduling';
export type {
  CreateReviewSessionInput,
  CheckReviewSessionAnswerInput,
  CheckReviewSessionAnswerResult,
  CreateVocabularyListInput,
  RemoveVocabularyResult,
  ReviewWordMapItem,
  SavedVocabularyItem,
  SavedVocabularyListResult,
  SaveVocabularyResult,
  SubmitReviewSessionInput,
  SubmitReviewSessionResult,
  UpdateSavedVocabularyItemsInput,
  UpdateSavedVocabularyItemsResult,
  UpdateVocabularyListInput,
  VocabularyListSummary,
  WordbankMasteryFilter,
  WordbankReviewMasteryResult,
  WordbankReviewSessionResult,
  WordbankSort,
  WordbankStats,
} from './wordbank/types';

export class SavedVocabularyService {
  static normalizeWord = normalizeWord;
  static list = listSavedVocabulary;
  static saveMany = saveVocabulary;
  static remove = removeVocabulary;
  static listLists = listVocabularyLists;
  static createList = createVocabularyList;
  static updateList = updateVocabularyList;
  static deleteList = deleteVocabularyList;
  static updateItems = updateSavedVocabularyItems;
  static createReviewSession = createReviewSession;
  static checkReviewSessionAnswer = checkReviewSessionAnswer;
  static submitReviewSession = submitReviewSession;
}
