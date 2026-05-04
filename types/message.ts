export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  encryptedKeyForSelf: string;
};

export type Message = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  payload: EncryptedPayload;
  delivered: boolean;
  created_at: string;
  text?: string;
  decryptError?: boolean;
};

export type ConversationSummary = {
  user_id: string;
  display_name: string;
  username: string;
  last_message_at: string | null;
};
