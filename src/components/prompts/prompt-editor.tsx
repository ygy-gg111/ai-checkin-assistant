'use client';

import {SettingOutlined} from '@ant-design/icons';
import {
  App,
  Button,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useMemo, useState} from 'react';

import {GuestEmptyState} from '@/components/auth/guest-empty-state';
import {useAuth} from '@/hooks/use-auth';
import {
  MAX_PROMPT_COMPLETION_TOKENS,
  MAX_PROMPT_INPUT_CHARS,
  MAX_PROMPT_PERSONA_CHARS,
  MAX_PROMPT_TEMPLATE_CHARS,
} from '@/lib/prompt';
import {DEFAULT_PROMPT_TEMPLATES} from '@/lib/prompts/default-templates';

const {Title, Text} = Typography;
const {TextArea} = Input;

type TopicType = 'swimming' | 'running' | 'study' | 'daily';

type PromptTemplateRecord = {
  id: string;
  name: string;
  scene: TopicType;
  version: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserSetting = {
  persona: string;
  defaultTopic: string;
  defaultStyle: string;
  aiProvider: string;
  currentModel: string;
  outputLang: string;
  storageMethod: string;
  storageRegion: string;
};

type PreviewResult = {
  title: string;
  content: string;
  tags: string[];
  coverText: string;
};

type PreviewResponse = {
  result: PreviewResult;
  provider: string;
  model: string;
  usage: {
    totalTokens?: number;
  } | null;
};

const TOPICS: TopicType[] = ['swimming', 'running', 'study', 'daily'];

const TEST_INPUTS: Record<TopicType, {zh: string; en: string}> = {
  swimming: {
    zh: '今天练蛙泳，腿还是不怎么走水，不过比昨天轻松一点。',
    en: 'Practiced breaststroke today. My leg kick still needs work, but it felt a bit lighter than yesterday.',
  },
  running: {
    zh: '今早跑了 5 公里，配速一般，但整个人清醒了很多。',
    en: 'Ran 5K this morning. Pace was average, but I felt much clearer afterward.',
  },
  study: {
    zh: '今天把 Next.js 路由缓存和数据刷新机制重新理顺了一遍。',
    en: 'Spent today sorting out Next.js route cache and data refresh behavior again.',
  },
  daily: {
    zh: '周末把房间彻底收拾了一遍，窗边终于能晒到太阳了。',
    en: 'Did a full room cleanup this weekend, and sunlight finally reaches the window again.',
  },
};

const OUTPUT_META: Record<TopicType, {length: string; tags: string}> = {
  swimming: {length: '100-180', tags: '4-6'},
  running: {length: '80-150', tags: '3-5'},
  study: {length: '100-180', tags: '3-5'},
  daily: {length: '100-160', tags: '3-5'},
};

const DEFAULT_SETTING: UserSetting = {
  persona: '一个普通程序员的生活重启记录。下班去游泳，偶尔跑步，偶尔摆烂。不励志，只记录。',
  defaultTopic: 'swimming',
  defaultStyle: 'natural',
  aiProvider: 'openai',
  currentModel: 'gpt-4o-mini',
  outputLang: 'zh-CN',
  storageMethod: 'local',
  storageRegion: 'ap-east',
};

export function PromptEditor() {
  const t = useTranslations('Prompts');
  const locale = useLocale();
  const {message} = App.useApp();
  const isEn = locale === 'en';
  const {isAuthenticated, status} = useAuth();

  const [sceneFilter, setSceneFilter] = useState<TopicType>('swimming');
  const [templates, setTemplates] = useState<PromptTemplateRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [settingsSnapshot, setSettingsSnapshot] = useState<UserSetting | null>(null);
  const [persona, setPersona] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [promptCode, setPromptCode] = useState('');
  const [testInput, setTestInput] = useState(getDefaultTestInput('swimming', isEn));
  const [testResult, setTestResult] = useState<PreviewResult | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{model: string; totalTokens: number | null} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');

  const sceneTemplates = useMemo(
    () => templates.filter((template) => template.scene === sceneFilter),
    [sceneFilter, templates]
  );

  const selectedTemplate = useMemo(
    () => sceneTemplates.find((template) => template.id === selectedTemplateId) ?? sceneTemplates[0] ?? null,
    [sceneTemplates, selectedTemplateId]
  );

  const activeTemplatesCount = useMemo(
    () => templates.filter((template) => template.isActive).length,
    [templates]
  );
  const personaLength = persona.length;
  const promptCodeLength = promptCode.length;
  const testInputLength = testInput.length;
  const newTemplateContentLength = newTemplateContent.length;

  const isPersonaDirty = persona.trim() !== (settingsSnapshot?.persona ?? '').trim();
  const isTemplateDirty = selectedTemplate
    ? nameDraft.trim() !== selectedTemplate.name || promptCode !== selectedTemplate.content
    : false;
  const hasUnsavedChanges = isPersonaDirty || isTemplateDirty;
  const activeMeta = OUTPUT_META[sceneFilter];

  useEffect(() => {
    if (status === 'loading' || !isAuthenticated) {
      return;
    }

    const controller = new AbortController();

    async function loadPromptData() {
      setIsLoading(true);
      try {
        const [promptResponse, settingsResponse] = await Promise.all([
          fetch('/api/prompts?includeInactive=1', {signal: controller.signal}),
          fetch('/api/user/settings', {signal: controller.signal}),
        ]);

        const promptPayload = await promptResponse.json() as {
          message?: string;
          data?: PromptTemplateRecord[];
        };
        const settingsPayload = await settingsResponse.json() as {
          message?: string;
          data?: {
            setting: UserSetting;
          };
        };

        if (!promptResponse.ok || !Array.isArray(promptPayload.data)) {
          throw new Error(promptPayload.message || (isEn ? 'Failed to load prompt templates' : 'Prompt 模板加载失败'));
        }
        if (!settingsResponse.ok || !settingsPayload.data?.setting) {
          throw new Error(settingsPayload.message || (isEn ? 'Failed to load account persona' : '账号人设加载失败'));
        }

        if (controller.signal.aborted) {
          return;
        }

        const nextTemplates = promptPayload.data;
        const nextScene = isTopicType(settingsPayload.data.setting.defaultTopic)
          ? settingsPayload.data.setting.defaultTopic
          : 'swimming';
        const nextSelectedTemplate = nextTemplates.find((template) => template.scene === nextScene) ?? null;

        setTemplates(nextTemplates);
        setSettingsSnapshot(settingsPayload.data.setting);
        setPersona(settingsPayload.data.setting.persona);
        setSceneFilter(nextScene);
        setSelectedTemplateId(nextSelectedTemplate?.id ?? null);
        setNameDraft(nextSelectedTemplate?.name ?? '');
        setPromptCode(nextSelectedTemplate?.content ?? '');
        setTestInput(getDefaultTestInput(nextScene, isEn));
        setTestResult(null);
        setPreviewMeta(null);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        message.error(error instanceof Error ? error.message : (isEn ? 'Failed to load prompt settings' : 'Prompt 设置加载失败'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadPromptData();

    return () => controller.abort();
  }, [isAuthenticated, isEn, message, status]);

  if (status !== 'loading' && !isAuthenticated) {
    return (
      <GuestEmptyState
        icon={<SettingOutlined />}
        titleKey="guest_promptsTitle"
        descKey="guest_promptsDesc"
      />
    );
  }

  const selectTemplate = (template: PromptTemplateRecord | null) => {
    setSelectedTemplateId(template?.id ?? null);
    setNameDraft(template?.name ?? '');
    setPromptCode(template?.content ?? '');
    setTestResult(null);
    setPreviewMeta(null);
  };

  const handleSceneChange = (scene: TopicType) => {
    const nextSceneTemplates = templates.filter((template) => template.scene === scene);
    setSceneFilter(scene);
    setTestInput(getDefaultTestInput(scene, isEn));
    selectTemplate(nextSceneTemplates[0] ?? null);
  };

  const handleOpenCreateModal = () => {
    const defaultTemplate = getDefaultTemplate(sceneFilter);
    setNewTemplateName(
      isEn
        ? `${t(sceneFilter)} Custom Template`
        : `${t(sceneFilter)}自定义模板`
    );
    setNewTemplateContent(selectedTemplate?.content || defaultTemplate?.content || '');
    setIsCreateModalOpen(true);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      message.warning(isEn ? 'Please enter a template name' : '请输入模板名称');
      return;
    }
    if (!newTemplateContent.trim()) {
      message.warning(isEn ? 'Please enter template content' : '请输入模板内容');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: newTemplateName.trim(),
          scene: sceneFilter,
          content: newTemplateContent,
          isActive: true,
        }),
      });
      const payload = await response.json() as {
        message?: string;
        data?: PromptTemplateRecord;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.message || (isEn ? 'Failed to create template' : '新建模板失败'));
      }

      setTemplates((current) => [payload.data!, ...current]);
      setSceneFilter(payload.data.scene);
      setTestInput(getDefaultTestInput(payload.data.scene, isEn));
      selectTemplate(payload.data);
      setIsCreateModalOpen(false);
      message.success(isEn ? 'Template created successfully' : '模板创建成功');
    } catch (error) {
      message.error(error instanceof Error ? error.message : (isEn ? 'Failed to create template' : '新建模板失败'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    if (!hasUnsavedChanges) {
      message.info(isEn ? 'No changes to save' : '当前没有需要保存的修改');
      return;
    }
    if (!persona.trim()) {
      message.warning(isEn ? 'Please enter account persona' : '请输入账号人设');
      return;
    }
    if (selectedTemplate && !nameDraft.trim()) {
      message.warning(isEn ? 'Please enter a template name' : '请输入模板名称');
      return;
    }
    if (selectedTemplate && !promptCode.trim()) {
      message.warning(isEn ? 'Please enter template content' : '请输入模板内容');
      return;
    }

    setIsSaving(true);
    try {
      const requests: Promise<void>[] = [];

      if (selectedTemplate && isTemplateDirty) {
        requests.push((async () => {
          const response = await fetch(`/api/prompts/${selectedTemplate.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              name: nameDraft.trim(),
              content: promptCode,
            }),
          });
          const payload = await response.json() as {
            message?: string;
            data?: PromptTemplateRecord;
          };

          if (!response.ok || !payload.data) {
            throw new Error(payload.message || (isEn ? 'Failed to save template' : '保存模板失败'));
          }

          setTemplates((current) => current.map((template) => (
            template.id === payload.data!.id ? payload.data! : template
          )));
        })());
      }

      if (isPersonaDirty) {
        const nextSetting = {
          ...(settingsSnapshot ?? DEFAULT_SETTING),
          persona: persona.trim(),
        };

        requests.push((async () => {
          const response = await fetch('/api/user/settings', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(nextSetting),
          });
          const payload = await response.json() as {
            message?: string;
            data?: UserSetting;
          };

          if (!response.ok || !payload.data) {
            throw new Error(payload.message || (isEn ? 'Failed to save persona' : '保存账号人设失败'));
          }

          setSettingsSnapshot(payload.data);
          setPersona(payload.data.persona);
        })());
      }

      await Promise.all(requests);
      message.success(isEn ? 'Prompt settings saved successfully' : 'Prompt 设置保存成功');
    } catch (error) {
      message.error(error instanceof Error ? error.message : (isEn ? 'Failed to save prompt settings' : 'Prompt 设置保存失败'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefault = () => {
    const defaultTemplate = getDefaultTemplate(sceneFilter);
    if (!defaultTemplate) {
      return;
    }

    setNameDraft(defaultTemplate.name);
    setPromptCode(defaultTemplate.content);
    setTestResult(null);
    setPreviewMeta(null);
    message.info(isEn ? 'Default template restored to draft' : '已恢复默认模板内容到当前草稿');
  };

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(promptCode);
      message.success(isEn ? 'Template copied' : '模板内容已复制');
    } catch {
      message.error(isEn ? 'Failed to copy template' : '复制模板失败');
    }
  };

  const handleToggleActive = async () => {
    if (!selectedTemplate) {
      return;
    }

    setIsToggling(true);
    try {
      const response = await fetch(`/api/prompts/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          isActive: !selectedTemplate.isActive,
        }),
      });
      const payload = await response.json() as {
        message?: string;
        data?: PromptTemplateRecord;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.message || (isEn ? 'Failed to update template status' : '更新模板状态失败'));
      }

      setTemplates((current) => current.map((template) => (
        template.id === payload.data!.id ? payload.data! : template
      )));
      message.success(payload.data.isActive
        ? (isEn ? 'Template enabled' : '模板已启用')
        : (isEn ? 'Template disabled' : '模板已停用'));
    } catch (error) {
      message.error(error instanceof Error ? error.message : (isEn ? 'Failed to update template status' : '更新模板状态失败'));
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/prompts/${selectedTemplate.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json() as {
        message?: string;
        data?: {
          id: string;
        };
      };

      if (!response.ok || !payload.data?.id) {
        throw new Error(payload.message || (isEn ? 'Failed to delete template' : '删除模板失败'));
      }

      const nextTemplates = templates.filter((template) => template.id !== payload.data!.id);
      const nextSelectedTemplate = nextTemplates.find((template) => template.scene === sceneFilter) ?? null;
      setTemplates(nextTemplates);
      selectTemplate(nextSelectedTemplate);
      message.success(isEn ? 'Template deleted' : '模板已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : (isEn ? 'Failed to delete template' : '删除模板失败'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTestGenerate = async () => {
    if (!selectedTemplate) {
      message.warning(isEn ? 'Please select a template first' : '请先选择一个模板');
      return;
    }
    if (!promptCode.trim()) {
      message.warning(isEn ? 'Please enter template content first' : '请先填写模板内容');
      return;
    }
    if (!testInput.trim()) {
      message.warning(isEn ? 'Please enter test input first' : '请先填写测试输入');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setPreviewMeta(null);

    try {
      const response = await fetch('/api/prompts/preview', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          scene: sceneFilter,
          persona,
          content: promptCode,
          inputText: testInput,
        }),
      });
      const payload = await response.json() as {
        message?: string;
        data?: PreviewResponse;
      };

      if (!response.ok || !payload.data?.result) {
        throw new Error(payload.message || (isEn ? 'Preview generation failed' : '测试生成失败'));
      }

      setTestResult(payload.data.result);
      setPreviewMeta({
        model: payload.data.model,
        totalTokens: payload.data.usage?.totalTokens ?? null,
      });
      message.success(isEn ? 'Preview generated successfully' : '测试生成成功');
    } catch (error) {
      message.error(error instanceof Error ? error.message : (isEn ? 'Preview generation failed' : '测试生成失败'));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      <div className="prompt-layout">
        <aside className="calendar-card prompt-templates-panel">
          <div className="history-card-head" style={{borderBottom: 'none', padding: '12px 14px 8px'}}>
            <Title level={5} style={{margin: 0}}>{t('templates')}</Title>
            <Text type="secondary" style={{fontSize: 11}}>
              {t('activeTemplatesCount', {count: activeTemplatesCount})}
            </Text>
          </div>

          <div className="create-chips" style={{padding: '0 10px 8px'}}>
            {TOPICS.map((topic) => (
              <button
                key={topic}
                className={`create-chip${sceneFilter === topic ? ' active' : ''}`}
                onClick={() => handleSceneChange(topic)}
              >
                {t(topic)}
              </button>
            ))}
          </div>

          <div className="prompt-templates-list">
            <Space direction="vertical" size={6} style={{width: '100%', marginTop: 4}}>
              {sceneTemplates.map((template) => {
                const isActive = selectedTemplate?.id === template.id;
                return (
                  <button
                    key={template.id}
                    className={`prompt-template-btn${isActive ? ' active' : ''}`}
                    onClick={() => selectTemplate(template)}
                  >
                    <span className="prompt-template-icon">{template.version}</span>
                    <div style={{textAlign: 'left', flex: 1, minWidth: 0}}>
                      <Tooltip title={template.name} placement="topLeft">
                        <b style={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {template.name}
                        </b>
                      </Tooltip>
                      <small>
                        v{template.version} · {template.isActive ? (isEn ? 'Enabled' : '已启用') : (isEn ? 'Disabled' : '已停用')}
                      </small>
                    </div>
                  </button>
                );
              })}
            </Space>
          </div>

          {isLoading ? (
            <div style={{padding: '18px 14px', textAlign: 'center'}}>
              <Spin size="small" />
            </div>
          ) : null}

          {!isLoading && sceneTemplates.length === 0 ? (
            <div style={{padding: '14px', color: '#94a3b8', fontSize: 12, lineHeight: 1.6}}>
              {isEn ? 'No templates yet for this topic. Create one to start editing.' : '当前主题下还没有模板，先新建一个再开始编辑。'}
            </div>
          ) : null}

          <Button className="prompt-new-btn" onClick={handleOpenCreateModal}>
            {t('newTemplate')}
          </Button>
        </aside>

        <section className="calendar-card" style={{display: 'flex', flexDirection: 'column'}}>
          <div className="prompt-editor-top">
            <div className="prompt-file-info" style={{ minWidth: 0, overflow: 'hidden' }}>
              <span>●</span>
              {selectedTemplate ? (
                <Tooltip title={`${selectedTemplate.name}.md`} placement="top">
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    minWidth: 0,
                    flex: 1
                  }}>
                    {selectedTemplate.name}.md
                  </span>
                </Tooltip>
              ) : (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isEn ? 'No template selected' : '未选择模板'}
                </span>
              )}
              {selectedTemplate ? (
                <span className="prompt-version-token" style={{ flexShrink: 0 }}>
                  v{selectedTemplate.version}
                </span>
              ) : null}
            </div>
            <span className="prompt-live-badge" style={{color: hasUnsavedChanges ? '#d97706' : '#059669'}}>
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  background: hasUnsavedChanges ? '#d97706' : '#059669',
                  borderRadius: '50%',
                }}
              />
              {hasUnsavedChanges ? (isEn ? 'Unsaved changes' : '有未保存修改') : (isEn ? 'Synced' : '已同步')}
            </span>
          </div>

          <div className="prompt-editor-body">
            <div className="prompt-field">
              <label>
                {isEn ? 'Template Name' : '模板名称'}
                <span>{selectedTemplate ? selectedTemplate.scene : sceneFilter}</span>
              </label>
              <Input
                value={nameDraft}
                disabled={!selectedTemplate}
                onChange={(event) => setNameDraft(event.target.value)}
                maxLength={100}
                placeholder={isEn ? 'Enter template name' : '请输入模板名称'}
              />
            </div>

            <div className="prompt-field">
              <label>
                {t('globalPersona')}
                <span>{t('globalPersonaDesc')}</span>
              </label>
              <TextArea
                className="prompt-textarea prompt-persona"
                value={persona}
                onChange={(event) => setPersona(event.target.value)}
                maxLength={MAX_PROMPT_PERSONA_CHARS}
                rows={4}
              />
              <div className="field-limit-note">
                <span>{isEn ? `Persona: ${personaLength} / ${MAX_PROMPT_PERSONA_CHARS}` : `人设长度：${personaLength} / ${MAX_PROMPT_PERSONA_CHARS}`}</span>
                <span>{isEn ? 'Saved persona is merged into the system prompt.' : '保存后的人设会一起拼进系统提示词。'}</span>
              </div>
            </div>

            <div className="prompt-field">
              <label>
                {t('templateLabel', {topic: t(sceneFilter)})}
                <span>{t('charAndVarCount', {chars: promptCodeLength, vars: countTemplateVariables(promptCode)})}</span>
              </label>
              <TextArea
                className="prompt-textarea prompt-code"
                value={promptCode}
                disabled={!selectedTemplate}
                onChange={(event) => setPromptCode(event.target.value)}
                maxLength={MAX_PROMPT_TEMPLATE_CHARS}
                rows={7}
              />
              <div className="field-limit-note">
                <span>{isEn ? `Template: ${promptCodeLength} / ${MAX_PROMPT_TEMPLATE_CHARS}` : `模板长度：${promptCodeLength} / ${MAX_PROMPT_TEMPLATE_CHARS}`}</span>
                <span>{isEn ? `Model output is capped at about ${MAX_PROMPT_COMPLETION_TOKENS} tokens.` : `模型输出已限制在约 ${MAX_PROMPT_COMPLETION_TOKENS} tokens。`}</span>
              </div>
            </div>

            <div className="prompt-hint-banner">
              <span>!</span>
              <span>{t('variableHint')}</span>
            </div>
          </div>

          <div className="prompt-versions-info">
            <span>
              {selectedTemplate
                ? t('lastEdit', {time: formatUpdatedAt(selectedTemplate.updatedAt, isEn)})
                : (isEn ? 'Select a template to start editing' : '选择模板后即可开始编辑')}
            </span>
            <span>{t('charAndVarCount', {chars: promptCodeLength, vars: countTemplateVariables(promptCode)})}</span>
          </div>
        </section>

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
              onChange={(event) => setTestInput(event.target.value)}
              maxLength={MAX_PROMPT_INPUT_CHARS}
            />
            <div className="field-limit-note compact">
              <span>{isEn ? `Test input: ${testInputLength} / ${MAX_PROMPT_INPUT_CHARS}` : `测试输入：${testInputLength} / ${MAX_PROMPT_INPUT_CHARS}`}</span>
              <span>{isEn ? `Preview output cap: about ${MAX_PROMPT_COMPLETION_TOKENS} tokens.` : `预览输出上限：约 ${MAX_PROMPT_COMPLETION_TOKENS} tokens。`}</span>
            </div>

            <Button
              className="prompt-test-btn"
              loading={isTesting}
              disabled={!selectedTemplate}
              onClick={() => void handleTestGenerate()}
            >
              {t('testBtn')}
            </Button>

            <div className="prompt-section-label">{t('previewResult')}</div>
            {testResult ? (
              <div className="prompt-result-box">
                <b>{testResult.title}</b>
                <p>{testResult.content}</p>
                <p style={{marginTop: 8}}>{testResult.tags.join(' ')}</p>
                {testResult.coverText ? <p style={{marginTop: 8}}>{isEn ? `Cover: ${testResult.coverText}` : `封面文案：${testResult.coverText}`}</p> : null}
              </div>
            ) : isTesting ? (
              <div style={{padding: '24px 0', textAlign: 'center'}}>
                <Spin size="small" />
              </div>
            ) : (
              <div style={{padding: '16px 10px', textAlign: 'center', color: '#94a3b8', fontSize: 12}}>
                {isEn ? 'Run a prompt test to preview generated output.' : '点击测试生成，查看当前 Prompt 的真实输出效果。'}
              </div>
            )}

            <div className="prompt-bubble-info">
              <b>{isEn ? 'Output Parameters' : '输出参数'}</b>
              <div style={{marginTop: 4, fontSize: 11.5, color: '#64748b'}}>
                <div>{isEn ? `Topic: ${t(sceneFilter)}` : `主题：${t(sceneFilter)}`}</div>
                <div>{t('paramsLength', {length: `${activeMeta.length} 字`})}</div>
                <div>{t('paramsTags', {tags: activeMeta.tags})}</div>
                <div>{t('paramsModel', {model: previewMeta?.model || settingsSnapshot?.currentModel || DEFAULT_SETTING.currentModel})}</div>
                <div>{isEn ? `Output cap: about ${MAX_PROMPT_COMPLETION_TOKENS} tokens` : `输出上限：约 ${MAX_PROMPT_COMPLETION_TOKENS} tokens`}</div>
              </div>
              {selectedTemplate ? (
                <div style={{marginTop: 10}}>
                  <Tag color={selectedTemplate.isActive ? 'green' : 'default'}>
                    {selectedTemplate.isActive ? (isEn ? 'Enabled' : '已启用') : (isEn ? 'Disabled' : '已停用')}
                  </Tag>
                </div>
              ) : null}
            </div>

            <div className="prompt-side-actions">
              <Button className="btn" disabled={!selectedTemplate} onClick={handleRestoreDefault}>
                {t('restoreDefault')}
              </Button>
              <Button className="btn" disabled={!selectedTemplate} onClick={() => void handleToggleActive()} loading={isToggling}>
                {selectedTemplate?.isActive ? (isEn ? 'Disable Template' : '停用模板') : (isEn ? 'Enable Template' : '启用模板')}
              </Button>
              <Button className="btn" disabled={!selectedTemplate} onClick={() => void handleCopyTemplate()}>
                {t('copyTemplate')}
              </Button>
              <Popconfirm
                title={isEn ? 'Delete this template?' : '确认删除这个模板吗？'}
                description={isEn ? 'This action cannot be undone.' : '删除后不可恢复。'}
                okText={isEn ? 'Delete' : '删除'}
                cancelText={isEn ? 'Cancel' : '取消'}
                onConfirm={() => void handleDelete()}
                disabled={!selectedTemplate || isProtectedDefaultTemplate(selectedTemplate)}
              >
                <Button
                  className="btn"
                  danger
                  loading={isDeleting}
                  disabled={!selectedTemplate || isProtectedDefaultTemplate(selectedTemplate)}
                >
                  {isEn ? 'Delete Template' : '删除模板'}
                </Button>
              </Popconfirm>
              <Button
                className="primary-btn"
                style={{gridColumn: '1 / -1'}}
                loading={isSaving}
                onClick={() => void handleSave()}
              >
                {t('saveTemplate')}
              </Button>
            </div>

            <div className="prompt-meta-info">
              <span>{t('estTokens', {count: previewMeta?.totalTokens ?? 0})}</span>
              <span>
                {selectedTemplate
                  ? `v${selectedTemplate.version}`
                  : (isEn ? 'No template' : '暂无模板')}
              </span>
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={isCreateModalOpen}
        title={isEn ? `New ${t(sceneFilter)} Template` : `新建${t(sceneFilter)}模板`}
        okText={isEn ? 'Create' : '创建'}
        cancelText={isEn ? 'Cancel' : '取消'}
        confirmLoading={isCreating}
        onOk={() => void handleCreateTemplate()}
        onCancel={() => setIsCreateModalOpen(false)}
      >
        <div className="prompt-field" style={{marginTop: 16}}>
          <label>{isEn ? 'Template Name' : '模板名称'}</label>
          <Input
            value={newTemplateName}
            onChange={(event) => setNewTemplateName(event.target.value)}
            maxLength={100}
            placeholder={isEn ? 'Enter template name' : '请输入模板名称'}
          />
        </div>
        <div className="prompt-field" style={{marginBottom: 0}}>
          <label>{isEn ? 'Template Content' : '模板内容'}</label>
          <TextArea
            className="prompt-textarea"
            value={newTemplateContent}
            onChange={(event) => setNewTemplateContent(event.target.value)}
            maxLength={MAX_PROMPT_TEMPLATE_CHARS}
            rows={10}
          />
          <div className="field-limit-note">
            <span>{isEn ? `Template: ${newTemplateContentLength} / ${MAX_PROMPT_TEMPLATE_CHARS}` : `模板长度：${newTemplateContentLength} / ${MAX_PROMPT_TEMPLATE_CHARS}`}</span>
            <span>{isEn ? `Model output is capped at about ${MAX_PROMPT_COMPLETION_TOKENS} tokens.` : `模型输出已限制在约 ${MAX_PROMPT_COMPLETION_TOKENS} tokens。`}</span>
          </div>
        </div>
      </Modal>
    </>
  );
}

function isTopicType(value: string): value is TopicType {
  return TOPICS.includes(value as TopicType);
}

function getDefaultTemplate(scene: TopicType) {
  return DEFAULT_PROMPT_TEMPLATES.find((template) => template.scene === scene);
}

function getDefaultTestInput(scene: TopicType, isEn: boolean) {
  return isEn ? TEST_INPUTS[scene].en : TEST_INPUTS[scene].zh;
}

function countTemplateVariables(template: string) {
  const matches = template.match(/\{\{[^{}]+\}\}/g);
  return matches?.length ?? 0;
}

function isProtectedDefaultTemplate(template: PromptTemplateRecord) {
  return template.version === '1.0' && TOPICS.includes(template.scene);
}

function formatUpdatedAt(value: string, isEn: boolean) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return isEn ? 'Unknown' : '未知';
  }

  return date.toLocaleString(isEn ? 'en-US' : 'zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
