x# Language Hit 项目文档

## 一、项目概述

**Language Hit**（废话升级）是一款基于 AI 的语言学习应用，帮助用户将日常想法、情绪或「废话」升级为地道的外语表达，并支持单词/短语查词。应用支持英语、日语、粤语三种目标语言，采用卡片式交互，强调潜台词、文化语境与幽默感。

---

## 二、项目结构

```
language-hit/
├── index.html              # HTML 入口，含 Tailwind CDN、字体、importmap
├── index.tsx               # React 应用入口
├── App.tsx                 # 主应用容器（状态、路由、业务编排）
├── types.ts                # 类型定义（AppMode、TargetLanguage、GeneratedCardData 等）
├── constants.ts            # 系统提示词与多语言 AI 指令
├── metadata.json           # 应用元数据
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
├── package.json            # 依赖管理
├── .env.local              # 环境变量（需配置 GEMINI_API_KEY）
├── components/
│   ├── InputArea.tsx       # 输入区域（灵感提示、提交）
│   ├── Flashcard.tsx       # 卡片展示（翻转、收藏、语音、可点击查词）
│   ├── ModeToggle.tsx      # 模式切换（废话升级 / 查词）
│   ├── ProfileView.tsx     # 个人收藏视图
│   ├── LanguageSelector.tsx # 语言选择器
│   └── RubyRenderer.tsx    # 日文振假名 / 注音渲染
└── services/
    └── geminiService.ts    # Gemini API 调用
```

---

## 三、技术架构

### 3.1 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 |
| 构建 | Vite 6 |
| 语言 | TypeScript 5.8 |
| AI | Google Gemini（gemini-3-flash-preview） |
| 样式 | Tailwind CSS（CDN） |
| 字体 | Inter、Noto Serif |
| 图标 | Lucide React |
| 存储 | localStorage |

### 3.2 核心依赖

```json
{
  "react": "^19.2.3",
  "react-dom": "^19.2.3",
  "@google/genai": "^1.35.0",
  "lucide-react": "^0.562.0",
  "html-to-image": "^1.11.11"
}
```

### 3.3 架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           App.tsx（主容器）                               │
│  • 视图切换：GENERATOR / PROFILE                                          │
│  • 模式：UPGRADE / LOOKUP                                                 │
│  • 状态：history, activeCards, navStack, totalUsageTime, targetLang      │
└─────────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ ModeToggle   │    │ Flashcard       │    │ InputArea        │
│ LanguageSel. │    │ RubyRenderer    │    │ （固定底部）      │
└──────────────┘    └─────────────────┘    └──────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │ geminiService    │
                    │ generateCardContent │
                    └──────────────────┘
```

### 3.4 数据流

1. 用户在 `InputArea` 输入 → 触发 `runGeneration`
2. `geminiService.generateCardContent()` 调用 Gemini API，传入 `responseSchema` 获取结构化 JSON
3. 返回数据转为 `GeneratedCardData`，写入 `activeCards` 和 `history`
4. `Flashcard` 展示当前卡片，支持点击单词查词、收藏、语音播放
5. 历史与使用时长持久化到 `localStorage`

---

## 四、业务逻辑

### 4.1 两种模式

| 模式 | 英文名 | 输入 | 输出 | 特点 |
|------|--------|------|------|------|
| **废话升级** | UPGRADE | 任意想法、句子、情绪 | 地道表达、解释、场景、例句 | 强调潜台词、文化语境、幽默感 |
| **查词** | LOOKUP | 单词或短语 | 定义、用法、例句 | 支持英语、日语、粤语 |

### 4.2 目标语言

- **ENGLISH**：英语
- **JAPANESE**：日语（含振假名 `<ruby>`）
- **CANTONESE**：粤语（繁体字，可选粤拼）

### 4.3 核心流程

1. **生成**：输入 → Gemini API → 结构化 JSON → `GeneratedCardData`
2. **历史**：每次生成写入 `history`，并同步到 `localStorage`
3. **收藏**：`isBookmarked` 控制，收藏卡片在 Profile 中展示
4. **查词**：点击卡片内单词 → 进入 LOOKUP 模式，当前卡片 ID 压入 `navStack`
5. **返回**：从 `navStack` 弹出，恢复上一张卡片
6. **使用时长**：每秒更新并写入 `localStorage`

### 4.4 数据持久化

| Key | 用途 |
|-----|------|
| `language_hit_history_v1` | 历史记录（含收藏状态） |
| `language_hit_usage_time_v1` | 累计使用时长（毫秒） |

### 4.5 向后兼容

历史数据加载时会做字段迁移：
- `englishPhrase` → `targetPhrase`
- `englishPhraseTranslation` → `targetPhraseTranslation`
- 缺失的 `language` 默认设为 `ENGLISH`

---

## 五、核心组件说明

### 5.1 App.tsx

- 管理全局状态：`view`、`mode`、`targetLang`、`history`、`activeCards`、`navStack`、`totalUsageTime`
- 负责 `runGeneration`、`handleWordLookup`、`handleBack`、`toggleBookmark`、`handleHistorySelect` 等业务逻辑
- 渲染 Header、ModeToggle、Flashcard、InputArea、History 列表、ProfileView

### 5.2 Flashcard.tsx

- **正面**：展示完整内容（用户输入、俏皮评论、目标短语、解释、场景、例句）
- **背面**：聚焦模式，仅显示目标短语与用户输入
- **交互**：翻转、收藏、语音播放、点击单词查词
- **ClickableSentence**：支持 `[短语]` 与 CJK 分词，使用 `Intl.Segmenter` 做多语言分词

### 5.3 InputArea.tsx

- 文本输入、Enter 提交
- Upgrade 模式下提供「灵感」按钮，随机填充预设短语
- 占位符随模式切换

### 5.4 RubyRenderer.tsx

- 渲染 `<ruby>Base<rt>Reading</rt></ruby>` 振假名
- 处理 `[注音]`、`(注音)` 等括号内容
- 提供 `cleanTextFromTags`、`cleanTextForAudio`、`cleanTextForDisplay` 等文本清理函数，分别用于 UI 展示、TTS 朗读、卡片背面显示

### 5.5 ProfileView.tsx

- 收藏列表，按 UPGRADE / LOOKUP 分类展示
- 使用时长 Tooltip（皇冠图标）
- 点击卡片进入详情，可取消收藏

---

## 六、技术实现要点

### 6.1 Gemini 结构化输出

- 使用 `responseMimeType: "application/json"` 和 `responseSchema` 保证返回格式稳定
- Upgrade 与 Lookup 使用不同的 Schema，字段包括 `targetPhrase`、`explanation`、`scenario`、`examples` 等

### 6.2 日语振假名

- AI 在 `targetPhrase`、`scenarioExample`、`examples`、`definitionTarget` 等字段中输出 `<ruby>Kanji<rt>Hiragana</rt></ruby>`
- `constants.ts` 中通过 `getRubyInstruction` 明确禁止在中文字段使用 Ruby 标签

### 6.3 TTS 语音

- 使用 `SpeechSynthesisUtterance`，按语言选择 `ja-JP`、`zh-HK`、`en-US`
- 粤语优先选择名称含 "Cantonese"、"Hong Kong" 的语音
- 日语 TTS 使用 `<rt>` 中的假名，避免 Kanji 误读

### 6.4 多语言分词

- 使用 `Intl.Segmenter` 的 `granularity: 'word'` 做分词
- 支持 `[短语]` 内短短语整体点击查词（CJK 长度 ≤5、英文 ≤3 词时保持分组）

### 6.5 卡片翻转动画

- CSS `perspective`、`transform-style: preserve-3d`、`backface-visibility: hidden` 实现 3D 翻转
- 正反面通过 `rotate-y-180` 区分

---

## 七、类型定义（types.ts）

```typescript
enum AppMode { UPGRADE | LOOKUP }
enum TargetLanguage { ENGLISH | JAPANESE | CANTONESE }

interface GeneratedCardData {
  id: string;
  type: AppMode;
  language: TargetLanguage;
  userInput: string;
  targetPhrase: string;
  targetPhraseTranslation?: string;
  wittyComment?: string;
  explanation: string;
  scenario: string;
  scenarioExample?: string;
  scenarioExampleTranslation?: string;
  definitionTarget?: string;  // Lookup 模式
  examples?: ExamplePair[];   // Lookup 模式
  timestamp: number;
  isBookmarked?: boolean;
}
```

---

## 八、配置与运行

### 8.1 环境变量

在 `.env.local` 中配置：

```
GEMINI_API_KEY=your_api_key
```

Vite 会将其注入为 `process.env.API_KEY` 和 `process.env.GEMINI_API_KEY`。

### 8.2 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器（端口 3000，host 0.0.0.0） |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览构建结果 |

### 8.3 路径别名

- `@` → 项目根目录

---

## 九、注意事项

1. **index.css**：`index.html` 引用了 `/index.css`，若不存在可自行创建或移除该引用；当前主要依赖 Tailwind CDN 与内联样式。
2. **API Key**：必须配置 `GEMINI_API_KEY` 才能正常调用 Gemini。
3. **模型**：当前使用 `gemini-3-flash-preview`，可根据需要调整 `geminiService.ts` 中的 `modelName`。
