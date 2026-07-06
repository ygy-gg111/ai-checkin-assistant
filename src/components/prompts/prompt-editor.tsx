'use client';

import {
  App,
  Button,
  Card,
  Input,
  Space,
  Spin,
  Tag,
  Typography
} from 'antd';
import {useLocale, useTranslations} from 'next-intl';
import {useState} from 'react';
import {SettingOutlined} from '@ant-design/icons';

import {GuestEmptyState} from '@/components/auth/guest-empty-state';
import {useAuth} from '@/hooks/use-auth';

const {Title, Paragraph, Text} = Typography;
const {TextArea} = Input;

type TopicType = 'swimming' | 'running' | 'study' | 'daily';

interface TemplateConfig {
  key: TopicType;
  version: string;
  icon: string;
  filename: string;
  variablesCount: number;
  tone: string;
  length: string;
  tagsCount: string;
  model: string;
  defaultPersona: {zh: string; en: string};
  defaultPrompt: {zh: string; en: string};
  defaultTestInput: {zh: string; en: string};
  defaultTestResult: {
    title: {zh: string; en: string};
    body: {zh: string; en: string};
  };
}

export function PromptEditor() {
  const t = useTranslations('Prompts');
  const locale = useLocale();
  const {message} = App.useApp();
  const isEn = locale === 'en';

  const {isAuthenticated, status} = useAuth();

  // Static configs to prevent next-intl variable formatting errors due to {{variables}} curly braces.
  const configs: Record<TopicType, TemplateConfig> = {
    swimming: {
      key: 'swimming',
      version: 'v1.3',
      icon: '≈',
      filename: 'swimming.md',
      variablesCount: 3,
      tone: t('toneNatural'),
      length: '100–180 words',
      tagsCount: '4–6',
      model: 'GPT-4o mini',
      defaultPersona: {
        zh: '一个普通程序员的生活重启记录。\n下班去游泳 / 偶尔跑步 / 偶尔摆烂。\n不励志，只记录。每天一点点重新开始。',
        en: 'A life restart log of an ordinary programmer.\nSwim after work / run occasionally / slack off occasionally.\nNo grand ambitions, just recording daily steps.'
      },
      defaultPrompt: {
        zh: `你正在为一个普通人的游泳打卡生成小红书文案。

写作要求：
1. 强调今天真实的训练内容和身体感受
2. 语言自然，不要制造励志感
3. 保留具体、细小、不完美的生活细节
4. 标题控制在 20 字以内
5. 正文 100–180 字，分成 2–4 段
6. 生成 4–6 个相关标签

禁止使用：逆袭、蜕变、狠狠坚持、人生开挂等夸张词。

变量：{{user_input}} · {{day_count}} · {{image_context}}`,
        en: `You are generating a social check-in post for swimming.

Writing requirements:
1. Emphasize actual training content and physical feelings.
2. Keep language natural, do not force inspiration.
3. Preserve tiny, unperfect life details.
4. Title under 20 chars.
5. Body 100-180 words, 2-4 paragraphs.
6. Generate 4-6 tags.

Variables: {{user_input}} · {{day_count}} · {{image_context}}`
      },
      defaultTestInput: {
        zh: '今天练蛙泳，腿还是不走水。',
        en: 'Practiced breaststroke today, legs still not pushing water well.'
      },
      defaultTestResult: {
        title: {zh: '下班后的 45 分钟，继续和水较劲', en: '45 minutes after work, still struggling with water'},
        body: {
          zh: '今天是游泳打卡第 12 天。蛙泳腿还是不怎么走水，不过比昨天松了一点。不励志，也不自律，就是卸下工作包袱泡在水里洗掉一天的疲惫。',
          en: 'Today is swim day 12. Breaststroke kicks still not pushing water well, but felt a bit lighter. Not showing off, just washing off the exhaustion in the pool.'
        }
      }
    },
    running: {
      key: 'running',
      version: 'v1.1',
      icon: '↗',
      filename: 'running.md',
      variablesCount: 3,
      tone: t('toneEnergetic'),
      length: '80–150 words',
      tagsCount: '3–5',
      model: 'GPT-4o mini',
      defaultPersona: {
        zh: '一个跑步爱好者的日常。\n每天奔跑，追求健康的体魄。\n用脚步丈量城市。',
        en: 'A running enthusiast\'s routine.\nRun daily, pursue healthy body.\nMeasure the city with footsteps.'
      },
      defaultPrompt: {
        zh: `你正在为一个爱好运动的普通人生成跑步打卡小红书文案。

写作要求：
1. 记录跑步的公里数、配速、用时等数据
2. 语言轻快动感，适合运动分享
3. 记录跑步过程中的心理活动或周边环境

变量：{{user_input}} · {{day_count}} · {{mileage}}`,
        en: `You are generating a running check-in post.

Writing requirements:
1. Record mileage, pace, and duration.
2. Keep tone light and energetic.
3. Describe thoughts or surrounding environment.

Variables: {{user_input}} · {{day_count}} · {{mileage}}`
      },
      defaultTestInput: {
        zh: '完成了今早的5公里跑步。',
        en: 'Finished my morning 5K run.'
      },
      defaultTestResult: {
        title: {zh: '迈出第一步，5公里达成！', en: 'Take the first step, 5K done!'},
        body: {
          zh: '迎着早晨的微风跑完了5公里，虽然大腿酸胀，但多巴胺分泌带来的爽快感让人上瘾！慢一点没关系，跑起来就赢了。',
          en: 'Finished 5K in the morning breeze. Legs are sore, but the dopamine is addictive! Slow is fine, you win by starting.'
        }
      }
    },
    study: {
      key: 'study',
      version: 'v1.0',
      icon: '⌘',
      filename: 'study.md',
      variablesCount: 2,
      tone: t('toneSimple'),
      length: '120–200 words',
      tagsCount: '2–4',
      model: 'GPT-4o mini',
      defaultPersona: {
        zh: '自主学习与技术探索笔记。\n踏实敲代码，每天进步一点点。\n主攻全栈技术开发。',
        en: 'Self-study and tech exploration logs.\nWrite code, improve daily.\nFocused on fullstack development.'
      },
      defaultPrompt: {
        zh: `你正在为一个专注提升的普通人生成学习打卡小红书文案。

写作要求：
1. 记录学习的内容或项目的进度
2. 突出专注和点滴积累，语言简洁诚恳
3. 可加上相关学习资源

变量：{{user_input}} · {{day_count}}`,
        en: `You are generating a study log check-in post.

Writing requirements:
1. Record topics learned or project milestones.
2. Keep tone focused, concise and honest.
3. Mention learning resources if applicable.

Variables: {{user_input}} · {{day_count}}`
      },
      defaultTestInput: {
        zh: '今天看了 Next.js 路由缓存原理。',
        en: 'Studied Next.js router cache principles today.'
      },
      defaultTestResult: {
        title: {zh: '终于弄懂了 Next.js 的缓存坑', en: 'Finally figured out Next.js cache pitfalls'},
        body: {
          zh: '今天花时间把 Next.js App Router 的客户端缓存机制理顺了。以前很多莫名其妙的页面不更新，这次终于知道问题所在，踏实地解决了一个盲点。',
          en: 'Spent today sorting out client cache in Next.js. Used to wonder why pages wouldn\'t refresh, now I finally know why. Cleared a major blind spot!'
        }
      }
    },
    daily: {
      key: 'daily',
      version: 'v1.2',
      icon: '☼',
      filename: 'daily.md',
      variablesCount: 2,
      tone: t('toneWarm'),
      length: '100–160 words',
      tagsCount: '3–5',
      model: 'GPT-4o mini',
      defaultPersona: {
        zh: '生活碎片收集器。\n琐碎、温暖、烟火气。\n热爱做饭和记录日常。',
        en: 'Daily life fragment collector.\nCozy, warm, authentic.\nLove cooking and capturing routines.'
      },
      defaultPrompt: {
        zh: `你正在为用户的日常生活打卡生成小红书文案。

写作要求：
1. 记录日常生活的琐碎和温馨点滴
2. 语言温柔细腻，富有生活气息
3. 不必强行输出观点，真实即可

变量：{{user_input}} · {{day_count}}`,
        en: `You are generating a daily life check-in post.

Writing requirements:
1. Capture warm details of daily routines.
2. Use a soft, cozy and descriptive tone.
3. Keep it authentic.

Variables: {{user_input}} · {{day_count}}`
      },
      defaultTestInput: {
        zh: '周末大扫除，收拾出了明亮的房间。',
        en: 'Weekend deep clean, made the room bright.'
      },
      defaultTestResult: {
        title: {zh: '打扫完房间，心情也跟着放晴', en: 'Cleaned the room, mood cleared up too'},
        body: {
          zh: '周末把堆满杂物的桌子和房间彻底清扫了一遍，阳光斜斜地洒在干净的地板上。生活常常需要这样一轮断舍离，腾出空间才能装下新的期待。',
          en: 'Gave the messy room a deep clean this weekend. Sunlight shining on the clean floor is so therapeutic. Life needs decluttering sometimes to make room for new hopes.'
        }
      }
    }
  };

  const [activeTab, setActiveTab] = useState<TopicType>('swimming');
  const activeConfig = configs[activeTab];

  // Form States (loaded per activeConfig)
  const [persona, setPersona] = useState(() => isEn ? configs.swimming.defaultPersona.en : configs.swimming.defaultPersona.zh);
  const [promptCode, setPromptCode] = useState(() => isEn ? configs.swimming.defaultPrompt.en : configs.swimming.defaultPrompt.zh);
  const [testInput, setTestInput] = useState(() => isEn ? configs.swimming.defaultTestInput.en : configs.swimming.defaultTestInput.zh);

  // Loading/Result States
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{title: string; body: string} | null>(null);

  if (status !== 'loading' && !isAuthenticated) {
    return (
      <GuestEmptyState
        icon={<SettingOutlined />}
        titleKey="guest_promptsTitle"
        descKey="guest_promptsDesc"
      />
    );
  }

  const handleTabChange = (key: TopicType) => {
    const nextConfig = configs[key];
    setActiveTab(key);
    setPersona(isEn ? nextConfig.defaultPersona.en : nextConfig.defaultPersona.zh);
    setPromptCode(isEn ? nextConfig.defaultPrompt.en : nextConfig.defaultPrompt.zh);
    setTestInput(isEn ? nextConfig.defaultTestInput.en : nextConfig.defaultTestInput.zh);
    setTestResult(null);
  };

  const handleTestGenerate = () => {
    if (!testInput.trim()) {
      message.warning(isEn ? 'Please fill test input first' : '请先填写测试输入');
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    // Simulate response delay
    setTimeout(() => {
      setTestResult({
        title: isEn ? activeConfig.defaultTestResult.title.en : activeConfig.defaultTestResult.title.zh,
        body: isEn ? activeConfig.defaultTestResult.body.en : activeConfig.defaultTestResult.body.zh
      });
      setIsTesting(false);
      message.success(isEn ? 'Test generated successfully!' : '测试文案生成完毕！');
    }, 1500);
  };

  const handleRestoreDefault = () => {
    setPersona(isEn ? activeConfig.defaultPersona.en : activeConfig.defaultPersona.zh);
    setPromptCode(isEn ? activeConfig.defaultPrompt.en : activeConfig.defaultPrompt.zh);
    message.info(t('restoreDefault'));
  };

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(promptCode);
      message.success(isEn ? 'Template copied!' : '模板文案已复制！');
    } catch {
      message.error(isEn ? 'Failed to copy' : '复制失败');
    }
  };

  const handleSave = () => {
    message.success(isEn ? 'Changes saved successfully!' : '更改保存成功！');
  };

  return (
    <div className="prompt-layout">
      {/* ── Left Column: Templates Sidebar ── */}
      <aside className="calendar-card prompt-templates-panel">
        <div className="history-card-head" style={{borderBottom: 'none', padding: '12px 14px 8px'}}>
          <Title level={5} style={{margin: 0}}>{t('templates')}</Title>
          <Text type="secondary" style={{fontSize: 11}}>{t('activeTemplatesCount', {count: 4})}</Text>
        </div>

        <Space direction="vertical" size={6} style={{width: '100%', marginTop: 8}}>
          {(['swimming', 'running', 'study', 'daily'] as TopicType[]).map((key) => {
            const cfg = configs[key];
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                className={`prompt-template-btn${isActive ? ' active' : ''}`}
                onClick={() => handleTabChange(key)}
              >
                <span className="prompt-template-icon">{cfg.icon}</span>
                <div>
                  <b>{t(key)}</b>
                  <small>{cfg.version} · {isEn ? 'Active' : '已启用'}</small>
                </div>
              </button>
            );
          })}
        </Space>

        <Button className="prompt-new-btn">
          {t('newTemplate')}
        </Button>
      </aside>

      {/* ── Middle Column: Code Editor ── */}
      <section className="calendar-card" style={{display: 'flex', flexDirection: 'column'}}>
        {/* Editor Top Bar */}
        <div className="prompt-editor-top">
          <div className="prompt-file-info">
            <span>●</span> {activeConfig.filename} <span className="prompt-version-token">{activeConfig.version}</span>
          </div>
          <span className="prompt-live-badge">
            <span style={{display: 'inline-block', width: 6, height: 6, background: '#059669', borderRadius: '50%'}} />
            {t('autoSave')}
          </span>
        </div>

        {/* Editor Area */}
        <div className="prompt-editor-body">
          {/* Persona */}
          <div className="prompt-field">
            <label>
              {t('globalPersona')}
              <span>{t('globalPersonaDesc')}</span>
            </label>
            <TextArea
              className="prompt-textarea prompt-persona"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              rows={3}
            />
          </div>

          {/* Template Code */}
          <div className="prompt-field">
            <label>
              {t('templateLabel', {topic: t(activeTab)})}
              <span>{t('charAndVarCount', {chars: promptCode.length, vars: activeConfig.variablesCount})}</span>
            </label>
            <TextArea
              className="prompt-textarea prompt-code"
              value={promptCode}
              onChange={(e) => setPromptCode(e.target.value)}
              rows={12}
            />
          </div>

          {/* Variables Hint */}
          <div className="prompt-hint-banner">
            <span>💡</span>
            <span>{t('variableHint')}</span>
          </div>
        </div>

        {/* Versions Info Footer */}
        <div className="prompt-versions-info">
          <span>{t('lastEdit', {time: isEn ? 'Today 13:48' : '今天 13:48'})}</span>
          <span>{t('charAndVarCount', {chars: promptCode.length, vars: activeConfig.variablesCount})}</span>
        </div>
      </section>

      {/* ── Right Column: Test Preview Card ── */}
      <aside className="calendar-card prompt-preview-card">
        <div className="history-card-head">
          <Title level={5} style={{margin: 0}}>{t('previewTitle')}</Title>
          <Text type="secondary" style={{fontSize: 11}}>{t('previewDesc')}</Text>
        </div>

        <div className="prompt-preview-body">
          <div className="prompt-section-label">{t('testInput')}</div>
          <Input
            className="prompt-test-input"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
          />

          <Button
            className="prompt-test-btn"
            loading={isTesting}
            onClick={handleTestGenerate}
          >
            {t('testBtn')}
          </Button>

          <div className="prompt-section-label">{t('previewResult')}</div>
          {testResult ? (
            <div className="prompt-result-box">
              <b>{testResult.title}</b>
              <p>{testResult.body}</p>
            </div>
          ) : isTesting ? (
            <div style={{padding: '24px 0', textAlign: 'center'}}>
              <Spin size="small" />
            </div>
          ) : (
            <div style={{padding: '16px 10px', textAlign: 'center', color: '#94a3b8', fontSize: 12}}>
              {isEn ? 'Execute test generate to see output preview' : '点击测试生成查看输出预览'}
            </div>
          )}

          {/* Config details bubble */}
          <div className="prompt-bubble-info">
            <b>{isEn ? 'Output Parameters' : '输出参数'}</b>
            <div style={{marginTop: 4, fontSize: 11.5, color: '#64748b'}}>
              <div>{t('paramsTone', {tone: activeConfig.tone})}</div>
              <div>{t('paramsLength', {length: activeConfig.length})}</div>
              <div>{t('paramsTags', {tags: activeConfig.tagsCount})}</div>
              <div>{t('paramsModel', {model: activeConfig.model})}</div>
            </div>
          </div>

          {/* Side action buttons */}
          <div className="prompt-side-actions">
            <Button className="btn" onClick={handleRestoreDefault}>{t('restoreDefault')}</Button>
            <Button className="btn" onClick={handleCopyTemplate}>{t('copyTemplate')}</Button>
            <Button className="primary-btn" onClick={handleSave}>{t('saveTemplate')}</Button>
          </div>

          <div className="prompt-meta-info">
            <span>{t('estTokens', {count: 620})}</span>
            <span>{t('lastTestTime', {time: 2.3})}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
