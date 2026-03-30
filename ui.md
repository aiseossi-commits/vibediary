```json
{
  "app": {
    "name": "바다 (VibeDiary)",
    "description": "발달장애인 돌봄 가족을 위한 음성 기록 앱",
    "slogan": "기록에 치이지 말고, 그냥 말하세요"
  },

  "navigation": {
    "structure": "conditional",
    "initial_flow": [
      { "condition": "DB 로딩 중", "screen": "SplashLoader" },
      { "condition": "아이 프로필 없음", "screen": "OnboardingScreen" },
      { "condition": "아이 프로필 있음", "screen": "MainTabNavigator" }
    ],
    "tab_navigator": {
      "tabs": [
        { "key": "Home",       "label": "홈",       "icon": "home",    "screen": "HomeScreen" },
        { "key": "Calendar",   "label": "캘린더",   "icon": "calendar","screen": "CalendarScreen" },
        { "key": "Search",     "label": "AI 등대",  "icon": "search",  "screen": "SearchScreen" },
        { "key": "VoyageLog",  "label": "항해일지", "icon": "journal", "screen": "VoyageLogScreen" }
      ]
    },
    "stack_screens": [
      { "key": "RecordDetail", "screen": "RecordDetailScreen", "presentation": "card" },
      { "key": "Tags",         "screen": "TagsScreen",         "presentation": "card" },
      { "key": "Settings",     "screen": "SettingsScreen",     "presentation": "card" },
      { "key": "Recording",    "screen": "RecordingScreen",    "presentation": "fullScreenModal" }
    ]
  },

  "screens": {
    "OnboardingScreen": {
      "description": "최초 실행 시 아이 이름 등록 화면",
      "layout": "centered_column",
      "elements": [
        { "type": "Text",      "role": "title",    "content": "바다의 이름을 / 지어주세요",     "style": "title_bold", "lineBreak": true },
        { "type": "Text",      "role": "subtitle", "content": "누구의 이야기를 기록할까요?...", "style": "body_secondary" },
        { "type": "TextInput", "role": "name_input","placeholder": "예: 지원이, 나의 바다",    "style": "bottom_border_only" },
        { "type": "Button",    "role": "submit",   "label": "시작하기",                        "style": "primary_filled_full_width" },
        { "type": "Text",      "role": "hint",     "content": "설정에서 언제든 추가하거나 변경할 수 있어요", "style": "caption_tertiary" }
      ]
    },

    "HomeScreen": {
      "description": "메인 홈 — 음성/텍스트 기록 입력 + 최근 기록 목록",
      "layout": "safe_area_top + keyboard_avoiding",
      "header": {
        "left":  { "type": "ChildSelector", "label": "[아이이름]의 바다", "icon": "chevron-down", "opens": "ChildPickerModal" },
        "right": [
          { "type": "IconButton", "icon": "pricetags-outline",  "navigates_to": "Tags" },
          { "type": "IconButton", "icon": "settings-outline",   "navigates_to": "Settings" }
        ]
      },
      "body": [
        {
          "type": "TextInputBar",
          "placeholder": "기록을 입력하세요...",
          "right_button": { "icon": "send", "shape": "circle_48", "color": "primary" }
        },
        {
          "type": "PearlButton",
          "description": "음성 녹음 시작 버튼",
          "size": 160,
          "icon": "mic-outline",
          "icon_size": 52,
          "animation": "pulse_rings_x3",
          "navigates_to": "Recording"
        },
        {
          "type": "FlatList",
          "item_component": "RecordCard",
          "page_size": 20,
          "pull_to_refresh": true,
          "empty_state": {
            "icon": "mic-outline",
            "text": "마이크를 눌러서 말하거나, 기록창에 타이핑해서 입력하세요"
          }
        }
      ],
      "modals": [
        {
          "id": "ChildPickerModal",
          "trigger": "ChildSelector 탭",
          "visible_when": "childList.length >= 2",
          "content": "아이 목록 + 전환 버튼"
        }
      ]
    },

    "CalendarScreen": {
      "description": "월별 기록 달력 + 날짜별 상세 바텀시트",
      "layout": "safe_area_top",
      "header": {
        "center": { "type": "Text", "content": "캘린더", "style": "title_bold" }
      },
      "body": [
        {
          "type": "Calendar",
          "library": "react-native-calendars",
          "custom_day": {
            "density_colors": "5단계 — 기록 개수에 비례",
            "today_style": "filled_circle_primary",
            "medical_dot": "우상단 흰색 점 (#의료 태그 보유 시)"
          },
          "month_picker": {
            "trigger": "헤더 월 탭",
            "layout": "연도 화살표 + 월 그리드(1~12)"
          },
          "swipe_navigation": { "direction": "horizontal", "threshold": 60, "action": "전날/다음날 이동" }
        },
        { "type": "DensityLegend", "levels": 5, "label_right": "의료 기록 점 표시" },
        {
          "type": "BottomSheet",
          "trigger": "날짜 탭",
          "height": "60% of screen",
          "drag_handle": true,
          "close_button": "우상단 ✕",
          "content": {
            "header": "M월 D일 (요일)",
            "record_list": "RecordCard × N",
            "empty_state": {
              "buttons": ["녹음 시작하기", "텍스트로 기록하기"],
              "divider": "또는"
            },
            "add_controls": {
              "voice_button": "녹음 추가하기",
              "text_input": "텍스트 입력 + 저장 버튼"
            }
          }
        }
      ]
    },

    "SearchScreen": {
      "description": "AI 등대 — 기록 기반 자연어 질의응답 채팅",
      "layout": "safe_area_top + keyboard_avoiding",
      "header": {
        "center": { "type": "Text", "content": "AI 등대", "style": "title_bold" },
        "subtitle": "무엇이든 물어보세요. 바다가 기억하고 있습니다."
      },
      "body": [
        {
          "type": "FlatList",
          "description": "채팅 메시지 목록",
          "items": [
            {
              "type": "UserBubble",
              "alignment": "right",
              "style": "primary_filled, border_radius_rounded"
            },
            {
              "type": "AssistantBubble",
              "alignment": "left",
              "style": "surface_shadow",
              "sub_elements": [
                { "type": "Text",          "role": "answer_text" },
                { "type": "ToggleButton",  "label": "근거 N건", "icon": "chevron-up/down",  "expands": "source_record_list" },
                { "type": "Button",        "label": "저장 / 저장됨", "icon": "bookmark",   "action": "save_to_voyage_log" },
                { "type": "FlatList",      "visible_when": "expanded", "item": "RecordCard" }
              ],
              "loading_state": { "component": "WaveLoader", "text": "바다가 기억을 찾고 있어요..." }
            }
          ],
          "empty_state": {
            "icon": "lighthouse-on (MaterialCommunityIcons)",
            "text": "기록된 내용을 바탕으로 무엇이든 물어보세요. 대화 내용은 저장되지 않아요."
          }
        }
      ],
      "input_area": {
        "type": "TextInput",
        "placeholder": "기록에 대해 물어보세요...",
        "submit_button": { "label": "검색", "style": "primary_filled", "loading": "ActivityIndicator" }
      }
    },

    "VoyageLogScreen": {
      "description": "AI 등대에서 저장한 탐색 기록 목록",
      "layout": "safe_area_top",
      "header": {
        "center": { "type": "Text", "content": "항해일지", "style": "title_bold" },
        "subtitle": "AI 등대에서 저장한 탐색 기록입니다."
      },
      "body": [
        {
          "type": "FlatList",
          "item": {
            "type": "LogCard",
            "elements": [
              { "type": "Text",       "role": "query",  "style": "semibold_primary" },
              { "type": "Text",       "role": "date",   "format": "YYYY.M.D", "style": "caption_tertiary" },
              { "type": "IconButton", "icon": "close",  "action": "delete_with_alert" },
              { "type": "Divider" },
              { "type": "Text",       "role": "answer", "style": "body_secondary" }
            ]
          },
          "empty_state": {
            "icon": "journal-outline",
            "text": "아직 저장된 항해일지가 없어요. AI 등대에서 검색 후 저장해보세요."
          }
        }
      ]
    },

    "RecordingScreen": {
      "description": "음성 녹음 전체화면 모달",
      "layout": "full_screen_modal, centered_column",
      "header": {
        "left": { "type": "Button", "label": "취소", "action": "dismiss_modal" }
      },
      "body": [
        { "type": "Text",        "role": "guide",    "content": "예: 아이 잠든 모습을 재워줬어요", "style": "caption_tertiary" },
        {
          "type": "OrganicBlob",
          "size": 120,
          "description": "음성 레벨 반응형 애니메이션 — 4개 모서리 반경 oscillation + scale spring",
          "library": "react-native-reanimated"
        },
        {
          "type": "StatusText",
          "states": {
            "idle":      "말씀해 주세요",
            "recording": "녹음 중입니다"
          }
        },
        { "type": "Timer",  "format": "MM:SS", "countdown_at": "MAX-5초", "countdown_color": "error" },
        {
          "type": "ButtonRow",
          "buttons": [
            { "id": "record_start", "shape": "circle_96", "center_dot": "circle_32_primary",  "action": "start_recording" },
            { "id": "record_stop",  "shape": "circle_48", "icon": "stop_square",              "color": "error", "action": "stop_recording" }
          ]
        }
      ],
      "processing_state": {
        "replaces": "body",
        "elements": [
          { "type": "WaveLoader" },
          { "type": "Text", "content": "기록을 처리하고 있습니다..." }
        ]
      },
      "constraints": {
        "MIN_DURATION_SEC": 3,
        "MAX_DURATION_SEC": 30,
        "SILENCE_THRESHOLD": 0.08,
        "LOW_AUDIO_THRESHOLD": 0.15
      }
    },

    "RecordDetailScreen": {
      "description": "기록 상세 보기 + 편집",
      "layout": "safe_area_top + keyboard_avoiding + scroll_view",
      "header": {
        "left":  { "type": "Button", "label": "< 뒤로",  "action": "goBack" },
        "right": { "type": "Button", "label": "삭제",    "style": "destructive", "action": "delete_with_alert" }
      },
      "sections": [
        {
          "id": "date",
          "elements": [
            { "type": "Text", "format": "YYYY년 M월 D일 (요일)", "style": "lg_semibold" },
            { "type": "Text", "format": "오전/오후 HH:MM",       "style": "sm_tertiary" }
          ]
        },
        {
          "id": "ai_pending_banner",
          "visible_when": "record.aiPending === true",
          "style": "accent_light_background",
          "elements": [
            { "type": "ActivityIndicator", "color": "accent" },
            { "type": "Text", "content": "AI가 기록을 분석하고 있습니다..." }
          ]
        },
        {
          "id": "tags",
          "header": { "label": "태그", "right_button": "편집" },
          "view_mode":  { "component": "TagChip × N", "empty": "태그 없음" },
          "edit_mode": {
            "component": "TagPickerRow",
            "description": "전체 태그 토글 선택 (global + 아이별 커스텀)",
            "actions": ["저장", "취소"]
          }
        },
        {
          "id": "summary",
          "title": "요약",
          "view_mode":  { "type": "Text", "style": "body_primary" },
          "edit_mode":  null
        },
        {
          "id": "structured_data",
          "visible_when": "record.structuredData 키 존재",
          "title": "상세 데이터",
          "component": "key-value 테이블 (짝수행 surfaceSecondary)"
        },
        {
          "id": "audio",
          "visible_when": "record.audioPath 존재",
          "title": "음성 녹음",
          "component": {
            "type": "AudioButton",
            "states": {
              "idle":    "▶ 음성 재생",
              "playing": "|| 재생 중..."
            }
          }
        },
        {
          "id": "raw_text",
          "title": "원본 텍스트",
          "header_right": { "idle": "수정", "editing": "저장 후 AI 재분석" },
          "view_mode":  { "type": "Text", "style": "sm_secondary" },
          "edit_mode":  { "type": "TextInput", "multiline": true, "border": "primary" }
        }
      ]
    },

    "TagsScreen": {
      "description": "태그 관리 + 태그별 기록 필터",
      "layout": "safe_area_top + keyboard_avoiding",
      "header": {
        "left":  { "type": "Text", "content": "태그",   "style": "title_bold" },
        "right": { "type": "Text", "content": "N개",    "style": "caption_tertiary" }
      },
      "body": [
        {
          "type": "TagGrid",
          "item": {
            "left":  ["ColorDot", "TagName"],
            "right": ["Count", "건", "DeleteButton (커스텀 태그만)"]
          },
          "default_tag_behavior": "삭제 버튼 미노출 (#의료 #투약 #행동 #일상 #치료)",
          "add_button": {
            "style": "dashed_border",
            "label": "+ 태그 추가",
            "expands_to": "TagCreateInput"
          },
          "tag_create_input": {
            "placeholder": "#새 태그",
            "submit": "추가 버튼 or 키보드 done",
            "child_scope": "activeChild.id 귀속"
          }
        },
        {
          "type": "FilterBar",
          "visible_when": "selectedTagIds.length > 0",
          "elements": [
            { "type": "Text", "content": "N개 태그 선택됨 · M개 기록" },
            { "type": "Button", "label": "선택 해제", "action": "clearSelection" }
          ]
        },
        {
          "type": "FlatList",
          "visible_when": "selectedTagIds.length > 0",
          "item_component": "RecordCard",
          "empty_state": "선택한 태그에 해당하는 기록이 없습니다"
        }
      ]
    },

    "SettingsScreen": {
      "description": "앱 설정 — 아이 관리, 테마, 데이터",
      "layout": "safe_area_top + scroll_view",
      "sections": [
        {
          "id": "app_info",
          "elements": [
            { "type": "Text", "content": "VibeDiary",                                   "style": "title_bold" },
            { "type": "Text", "content": "기록에 치이지 말고, 그냥 말하세요",           "style": "body_secondary" },
            { "type": "Text", "content": "v{version} (build {nativeBuildVersion})",     "style": "caption_tertiary" }
          ]
        },
        {
          "id": "donation",
          "title": "후원",
          "elements": [
            { "type": "Text",   "role": "description" },
            { "type": "Button", "label": "계좌 복사", "action": "copy_to_clipboard" }
          ]
        },
        {
          "id": "offline_queue",
          "title": "AI 처리 대기 중 기록",
          "elements": [
            { "type": "Text",   "content": "대기 N건" },
            { "type": "Button", "label": "처리하기", "action": "processOfflineQueue(force=true)" }
          ]
        },
        {
          "id": "child_management",
          "title": "아이 관리",
          "elements": [
            {
              "type": "ChildList",
              "item": {
                "left":  "아이 이름 (활성 표시)",
                "right": ["편집 버튼", "삭제 버튼"]
              }
            },
            { "type": "Button", "label": "+ 새 아이 추가", "style": "dashed_border" }
          ],
          "modal": {
            "id": "ChildNameModal",
            "elements": ["TextInput", "취소 버튼", "확인 버튼"]
          }
        },
        {
          "id": "theme",
          "title": "화면 모드",
          "elements": [
            {
              "type": "ToggleSwitch",
              "label": "다크 모드",
              "track_size": "51x31",
              "thumb_size": "27x27"
            },
            {
              "type": "PaletteSelector",
              "description": "8개 팔레트 원형 스와치 선택",
              "palettes": [
                "sage (세이지 그린)",
                "emerald (에메랄드)",
                "gold (골드)",
                "amber (앰버)",
                "calmBlue (칼름 블루)",
                "deepOcean (딥 오션)",
                "clearSky (맑은 하늘)",
                "slateNavy (슬레이트 네이비)"
              ],
              "swatch_size": 36,
              "selected_indicator": "border_2.5_primary"
            }
          ]
        },
        {
          "id": "data",
          "title": "데이터 관리",
          "elements": [
            { "type": "Button", "label": "백업 내보내기",   "action": "exportBackup" },
            { "type": "Button", "label": "백업 복원",       "action": "importBackup" },
            { "type": "Button", "label": "검색 재인덱싱",  "action": "reindex_embeddings", "style": "secondary" }
          ]
        }
      ]
    }
  },

  "components": {
    "RecordCard": {
      "file": "src/components/RecordCard.tsx",
      "description": "기록 목록 카드 — 홈/캘린더/태그 화면에서 공용 사용",
      "props": {
        "record":          "RecordWithTags",
        "onPress":         "() => void",
        "showAgeOverlay":  "boolean (기본 true)",
        "timeOnly":        "boolean (기본 false)",
        "customLabel":     "string | undefined"
      },
      "layout": "vertical_card",
      "elements": [
        { "type": "Text",    "role": "date_label",  "format": "timeOnly ? HH:MM : M/D HH:MM" },
        { "type": "Badge",   "role": "ai_pending",  "visible_when": "record.aiPending" },
        { "type": "Text",    "role": "summary",     "numberOfLines": 3 },
        { "type": "TagChipRow", "items": "record.tags" },
        {
          "type": "AgeOverlay",
          "description": "경과 시간에 따른 반투명 회색 오버레이",
          "opacity_map": {
            "0일 (오늘)":  0,
            "1일 (어제)":  0.18,
            "2~3일":       0.28,
            "4~7일":       0.38,
            "8~14일":      0.48,
            "15일+":       0.58
          }
        }
      ],
      "style": {
        "background":       "colors.surface",
        "border_top":       "흰색 반투명 (depth 효과)",
        "border_left":      "흰색 반투명 (depth 효과)",
        "border_right":     "흰색 반투명 (depth 효과)",
        "border_bottom":    "colors.border",
        "border_radius":    20,
        "shadow":           "SHADOW.sm"
      }
    },

    "TagChip": {
      "file": "src/components/TagChip.tsx",
      "description": "태그 표시 칩 — 보기/선택/제거 모드 지원",
      "props": {
        "name":     "string",
        "onPress":  "() => void | undefined",
        "onRemove": "() => void | undefined",
        "selected": "boolean | undefined",
        "size":     "'sm' | 'md' (기본 sm)"
      },
      "sizes": {
        "sm": { "padding": "6x10",  "gap": 4, "font": 11, "dot": 6 },
        "md": { "padding": "9x14",  "gap": 5, "font": 13, "dot": 8 }
      },
      "style": {
        "background": "selected ? tagColor : tagColor+'18'",
        "text_color": "selected ? textOnPrimary : tagColor",
        "border_radius": "full (999)"
      },
      "tag_color_map": {
        "#의료": "colors.tagMedical (#EF4444)",
        "#투약": "colors.tagMedication (primary)",
        "#행동": "colors.tagBehavior (#EAB308)",
        "#일상": "colors.tagDaily (#22C55E)",
        "#치료": "colors.tagTherapy (#A855F7)",
        "기타":  "colors.textSecondary"
      }
    },

    "WaveLoader": {
      "file": "src/components/WaveLoader.tsx",
      "description": "파도 형태 로딩 애니메이션",
      "props": {
        "color": "string | undefined (기본 colors.primary)",
        "size":  "number | undefined (기본 1, scale 배수)"
      },
      "animation": {
        "bars": 6,
        "bar_size": "width:5, max_height:40, min_height:8",
        "per_bar_delay": "110ms",
        "duration": "380ms",
        "transform": "scaleY",
        "driver": "useNativeDriver:true"
      }
    },

    "OrganicBlob": {
      "file": "src/screens/RecordingScreen.tsx (inline)",
      "description": "녹음 화면 음성 레벨 반응형 blob 애니메이션",
      "size": 120,
      "animation": {
        "library": "react-native-reanimated",
        "corners": 4,
        "per_corner_sequence": "withRepeat + withSequence + withTiming",
        "audio_response": "withSpring (stiffness:90, damping:14)"
      }
    }
  },

  "design_system": {
    "color_palettes": {
      "count": 8,
      "keys": ["sage", "emerald", "gold", "amber", "calmBlue", "deepOcean", "clearSky", "slateNavy"],
      "modes": ["dark", "light"],
      "color_tokens": [
        "primary", "primaryLight", "primaryDark",
        "secondary", "accent", "accentLight",
        "background", "surface", "surfaceSecondary",
        "textPrimary", "textSecondary", "textTertiary", "textOnPrimary",
        "border", "divider",
        "error", "success", "warning", "info",
        "tagMedical", "tagMedication", "tagBehavior", "tagDaily", "tagTherapy",
        "micBg", "micBorder", "micIcon", "micLabel",
        "tabBg", "tabBorder", "tabInactive",
        "darkDensity[0~4]", "lightDensity[0~4]"
      ]
    },

    "spacing": {
      "xs":  4,
      "sm":  8,
      "md":  16,
      "lg":  24,
      "xl":  40,
      "xxl": 56
    },

    "font_size": {
      "xs":    11,
      "sm":    13,
      "md":    15,
      "lg":    17,
      "xl":    20,
      "xxl":   24,
      "title": 28
    },

    "font_weight": {
      "regular":  "400",
      "medium":   "500",
      "semibold": "600",
      "bold":     "700"
    },

    "font_family": {
      "regular":  "Pretendard-Regular",
      "medium":   "Pretendard-Medium",
      "semibold": "Pretendard-SemiBold",
      "bold":     "Pretendard-Bold"
    },

    "border_radius": {
      "sm":         8,
      "md":         12,
      "lg":         16,
      "xl":         24,
      "extraLarge": 32,
      "full":       999
    },

    "shadow": {
      "sm": { "offset": [0,2],  "opacity": 0.20, "radius": 6,  "elevation": 3 },
      "md": { "offset": [0,4],  "opacity": 0.25, "radius": 12, "elevation": 6 },
      "lg": { "offset": [0,8],  "opacity": 0.30, "radius": 24, "elevation": 12 }
    },

    "touch_target": {
      "min":           48,
      "record_button": 96,
      "fab":           56
    },

    "coding_conventions": {
      "styles":   "createStyles(colors) — 컴포넌트 외부 정의",
      "colors":   "useTheme().colors — 하드코딩 금지",
      "spacing":  "SPACING 상수 사용",
      "font":     "FONT_SIZE / FONT_WEIGHT 상수 사용"
    }
  }
}
```
