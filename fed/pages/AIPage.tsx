import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../services/api';
import { BrainIcon, TrashIcon } from '../components/Icons';
import { AIConfigModal } from '../components/modals/AIConfigModal';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  isStreaming?: boolean;
}

interface Report {
  id: string;
  totalMonthly: number;
  totalYearly: number;
  categories: { name: string; amount: number; percentage: number }[];
  insights: string[];
  createdAt: string;
}

// Markdown 组件样式
const MarkdownComponents = {
  p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
  li: ({ children }: any) => <li className="text-inherit">{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
  code: ({ inline, children }: any) => 
    inline 
      ? <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
      : <code className="block bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto my-2">{children}</code>,
  pre: ({ children }: any) => <pre className="my-2">{children}</pre>,
  h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-base font-bold mb-2">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
  blockquote: ({ children }: any) => <blockquote className="border-l-2 border-blue-300 pl-3 italic text-slate-600 my-2">{children}</blockquote>,
  a: ({ href, children }: any) => <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
  table: ({ children }: any) => <table className="border-collapse w-full my-2 text-xs">{children}</table>,
  th: ({ children }: any) => <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }: any) => <td className="border border-slate-200 px-2 py-1">{children}</td>,
};

export const AIPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'reports'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadChatHistory();
    loadReports();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const history = await api.getChatHistory();
      setMessages(history);
    } catch (err) {
      console.error('加载对话历史失败:', err);
    }
  };

  const loadReports = async () => {
    try {
      const data = await api.getAIReports();
      setReports(data);
    } catch (err) {
      console.error('加载报告失败:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      createdAt: new Date().toISOString(),
    };
    
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      const token = api.getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: inputMessage, stream: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.choices?.[0]?.delta?.content) {
                  fullContent += data.choices[0].delta.content;
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: fullContent }
                      : msg
                  ));
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      }

      // 标记流式结束
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, isStreaming: false }
          : msg
      ));

    } catch (err: any) {
      if (err.message?.includes('配置')) {
        setShowConfig(true);
      }
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, content: `错误: ${err.message || '发送失败'}`, isStreaming: false }
          : msg
      ));
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!confirm('确定清空所有对话记录？')) return;
    try {
      await api.clearChatHistory();
      setMessages([]);
    } catch (err) {
      console.error('清空对话失败:', err);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await api.analyzeSubscriptions();
      await loadReports();
      setSelectedReport({
        id: Date.now().toString(),
        ...result,
        createdAt: new Date().toISOString(),
      });
      setActiveTab('reports');
    } catch (err: any) {
      if (err.message?.includes('配置')) {
        setShowConfig(true);
      } else {
        alert(err.message || '分析失败');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 自动调整 textarea 高度
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <BrainIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">智能财务助手</h2>
            <p className="text-xs text-slate-400">AI 驱动的订阅分析与建议</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 text-white text-xs font-medium rounded-lg cursor-pointer transition-all duration-200 shadow-sm"
          >
            {isAnalyzing ? '分析中...' : '生成审计报告'}
          </button>
          <button
            onClick={() => setShowConfig(true)}
            className="px-3 py-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 text-xs font-medium rounded-lg cursor-pointer transition-colors duration-200"
          >
            配置
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200/60 px-6">
        <div className="flex space-x-1">
          {[
            { key: 'chat', label: '对话' },
            { key: 'reports', label: `历史报告 (${reports.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'chat' | 'reports')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 cursor-pointer ${
                activeTab === tab.key 
                  ? 'text-violet-600 border-violet-600' 
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <BrainIcon className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="font-medium text-slate-500">开始与 AI 助手对话</p>
                  <p className="text-xs mt-1 text-slate-400">询问关于您订阅支出的任何问题</p>
                  <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md">
                    {['分析我的订阅支出', '有哪些省钱建议？', '哪些订阅即将到期？'].map(q => (
                      <button
                        key={q}
                        onClick={() => setInputMessage(q)}
                        className="px-3 py-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-full hover:border-violet-300 hover:text-violet-600 cursor-pointer transition-colors duration-200"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white'
                            : 'bg-white border border-slate-200/60 text-slate-700 shadow-sm'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm prose-slate max-w-none">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={MarkdownComponents}
                            >
                              {msg.content || (msg.isStreaming ? '思考中...' : '')}
                            </ReactMarkdown>
                            {msg.isStreaming && msg.content && (
                              <span className="inline-block w-1.5 h-4 bg-violet-500 animate-pulse ml-0.5 align-middle" />
                            )}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="bg-white border-t border-slate-200/60 px-6 py-4">
              <div className="max-w-3xl mx-auto flex items-end space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="输入消息... (Shift+Enter 换行)"
                    rows={1}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none transition-all duration-200"
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isSending}
                  className="px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:from-slate-200 disabled:to-slate-300 text-white text-sm font-medium rounded-xl cursor-pointer transition-all duration-200 shadow-sm"
                >
                  {isSending ? '...' : '发送'}
                </button>
                {messages.length > 0 && (
                  <button
                    onClick={handleClearChat}
                    className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors duration-200"
                    title="清空对话"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto px-6 py-6">
            <div className="max-w-3xl mx-auto">
              {selectedReport ? (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="text-violet-600 hover:text-violet-700 text-sm font-medium cursor-pointer flex items-center space-x-1"
                    >
                      <span>←</span>
                      <span>返回列表</span>
                    </button>
                    <span className="text-xs text-slate-400">
                      {new Date(selectedReport.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <ReportDetail report={selectedReport} />
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <BrainIcon className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="font-medium text-slate-500">暂无审计报告</p>
                      <p className="text-xs mt-1">点击"生成审计报告"开始分析</p>
                    </div>
                  ) : (
                    reports.map(report => (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className="bg-white border border-slate-200/60 rounded-xl p-4 cursor-pointer hover:border-violet-200 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              月支出 ¥{report.totalMonthly.toFixed(0)} / 年支出 ¥{report.totalYearly.toFixed(0)}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {report.categories.length} 个分类 · {report.insights.length} 条建议
                            </p>
                          </div>
                          <span className="text-xs text-slate-400">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AIConfigModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        onSaved={() => {}}
      />
    </div>
  );
};

// 报告详情组件
const ReportDetail: React.FC<{ report: Report }> = ({ report }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white p-5 rounded-xl border border-slate-200/60">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">平均月支出</p>
        <p className="text-2xl font-bold text-slate-900">¥{report.totalMonthly.toFixed(0)}</p>
      </div>
      <div className="bg-white p-5 rounded-xl border border-slate-200/60">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">年度预算</p>
        <p className="text-2xl font-bold text-slate-900">¥{report.totalYearly.toFixed(0)}</p>
      </div>
    </div>

    <div className="bg-white p-5 rounded-xl border border-slate-200/60 space-y-4">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">消费结构</h4>
      {report.categories.map((cat, idx) => (
        <div key={idx}>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium text-slate-700">{cat.name}</span>
            <span className="text-slate-500">¥{cat.amount.toFixed(0)} ({cat.percentage}%)</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-violet-500 to-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${cat.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>

    <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-5 rounded-xl border border-violet-100/50">
      <h4 className="text-violet-700 font-semibold mb-4 text-xs uppercase tracking-wide flex items-center">
        <BrainIcon className="w-4 h-4 mr-2" />
        优化建议
      </h4>
      <ul className="space-y-3">
        {report.insights.map((insight, idx) => (
          <li key={idx} className="flex items-start space-x-3 text-slate-600 text-sm">
            <span className="mt-1.5 w-1.5 h-1.5 bg-violet-400 rounded-full flex-shrink-0" />
            <span>{insight}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);
