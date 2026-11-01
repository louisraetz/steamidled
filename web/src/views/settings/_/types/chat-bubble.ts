export interface ChatBubbleModel {
  key: string;
  text: string;
  meta: string | null;
}

export interface TelegramPreviewModel {
  bubbles: ChatBubbleModel[];
  alwaysSent: ChatBubbleModel;
}
