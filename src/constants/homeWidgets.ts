export const HOME_WIDGETS = {
  VOICE_INPUT:    'widget_voice_input',
  TEXT_INPUT:     'widget_text_input',
  EVENT_TRACKER:  'widget_event_tracker',
  RECENT_RECORDS: 'widget_recent_records',
  AI_INPUT_MODE:  'widget_ai_input_mode',
} as const;

export type HomeWidgetKey = typeof HOME_WIDGETS[keyof typeof HOME_WIDGETS];

export const HOME_WIDGET_DEFAULTS: Record<HomeWidgetKey, boolean> = {
  [HOME_WIDGETS.VOICE_INPUT]:    true,
  [HOME_WIDGETS.TEXT_INPUT]:     true,
  [HOME_WIDGETS.EVENT_TRACKER]:  true,
  [HOME_WIDGETS.RECENT_RECORDS]: true,
  [HOME_WIDGETS.AI_INPUT_MODE]:  true,
};
