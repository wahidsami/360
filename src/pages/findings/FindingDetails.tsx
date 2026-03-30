import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ShieldAlert, CheckCircle, FileText, Image as ImageIcon,
  Send, Download, Share2, Sparkles, Trash2
} from 'lucide-react';
import { Badge, Button, GlassCard, Label, Select, TextArea } from "@/components/ui/UIComponents";
import { api } from '@/services/api';
import { Finding, User, isInternalRole, Role, Permission } from '@/types';
import { PermissionGate } from '@/components/PermissionGate';
import { useAI } from '@/contexts/AIContext';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface RichFinding extends Finding {
  projectName: string;
  clientName: string;
  created: string;
}


export const FindingDetails: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { findingId } = useParams();
  const { openAI, setContext } = useAI();
  const { user } = useAuth();
  const [finding, setFinding] = useState<RichFinding | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [replyText, setReplyText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postingComment, setPostingComment] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    impact: '',
    remediation: ''
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const formatTimelineAction = (action: string) =>
    action
      .replace(/^finding\./, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase());

  useEffect(() => {
    if (findingId) setContext({ findingId });
    return () => setContext({});
  }, [findingId, setContext]);

  useEffect(() => {
    if (user?.role === Role.FINANCE) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!findingId) return;
      setLoading(true);
      const [basicFinding, commentData, allUsers] = await Promise.all([
        api.findings.get(findingId),
        api.findings.getComments(findingId),
        api.users.list(),
      ]);

      if (basicFinding) {
        setFinding({
          ...basicFinding,
          projectName: basicFinding.project?.name || 'Unknown Project',
          clientName: basicFinding.project?.client?.name || 'Unknown Client',
          created: basicFinding.createdAt ? new Date(basicFinding.createdAt).toLocaleString() : 'Unknown',
        });
        setComments(commentData);

        const internalStaff = allUsers.filter(u => isInternalRole(u.role));
        setAssignableUsers(internalStaff);
      }
      setLoading(false);
    };
    load();
  }, [findingId]);

  const handlePostReply = async (parentId?: string, text?: string) => {
    const content = text || replyText;
    if (!findingId || !content.trim()) return;

    setPostingComment(true);
    try {
      const newComment = await api.findings.createComment(findingId, {
        content,
        parentId
      });

      if (newComment) {
        setReplyText('');
        // Refresh comments
        const updated = await api.findings.getComments(findingId);
        setComments(updated);
      }
    } catch (e) {
      console.error('Failed to post comment:', e);
    } finally {
      setPostingComment(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!findingId || !finding) return;
    try {
      const updated = await api.findings.update(finding.projectId, findingId, { status: newStatus as any });
      if (updated) {
        setFinding({ ...finding, status: updated.status });
        toast.success('Status updated');
      }
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const handleSeverityUpdate = async (newSev: string) => {
    if (!findingId || !finding) return;
    try {
      const updated = await api.findings.update(finding.projectId, findingId, { severity: newSev as any });
      if (updated) {
        setFinding({ ...finding, severity: updated.severity });
        toast.success('Severity updated');
      }
    } catch (e) {
      toast.error('Failed to update severity');
    }
  };

  const handleStartEdit = () => {
    setEditForm({
      title: finding?.title || '',
      description: finding?.description || '',
      impact: finding?.impact || '',
      remediation: finding?.remediation || ''
    });
    setIsEditing(true);
  };

  const handleSaveDetails = async () => {
    if (!findingId || !finding) return;
    const updatedFinding = await api.findings.update(finding.projectId, findingId, editForm);
    if (updatedFinding) {
      setFinding({
        ...finding,
        title: updatedFinding.title,
        description: updatedFinding.description,
        impact: updatedFinding.impact,
        remediation: updatedFinding.remediation,
        ownerName: updatedFinding.assignedTo?.name || 'Unassigned'
      });
      setIsEditing(false);
    }
  };

  const handleAssigneeUpdate = async (userId: string) => {
    if (!findingId || !finding) return;
    const updatedFinding = await api.findings.update(finding.projectId, findingId, { assignedToId: userId === 'none' ? null : userId });
    if (updatedFinding) {
      setFinding({
        ...finding,
        ownerName: updatedFinding.assignedTo?.name || 'Unassigned',
        assignedToId: updatedFinding.assignedToId
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !findingId || !finding) return;

    setUploading(true);
    try {
      const asset = await api.findings.uploadFile(findingId, file);
      if (asset) {
        // Refresh finding to get new evidence list
        const refreshed = await api.findings.get(findingId);
        if (refreshed) {
          setFinding({
            ...finding,
            evidence: refreshed.evidence
          });
        }
      }
    } catch (e) {
      console.error('Failed to upload evidence:', e);
    } finally {
      setUploading(false);
    }
  };
  const handleFileAction = async (fileId: string) => {
    if (!findingId) return;
    try {
      const url = await api.findings.downloadFile(findingId, fileId, true);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = '';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('File action failed', err);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!findingId || !window.confirm('Are you sure you want to delete this evidence?')) return;

    try {
      const success = await api.findings.deleteFile(findingId, fileId);
      if (success) {
        toast.success('Evidence deleted');
        // Refresh evidence list
        const refreshed = await api.findings.get(findingId);
        if (refreshed) {
          setFinding({
            ...finding!,
            evidence: refreshed.evidence
          });
        }
      }
    } catch (err) {
      console.error('Failed to delete file', err);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading intelligence...</div>;
  if (!finding) return <div className="p-12 text-center text-slate-500">Finding not found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/app/findings')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Badge variant={finding.severity === 'critical' ? 'danger' : finding.severity === 'high' ? 'warning' : 'info'}>
                {finding.severity.toUpperCase()}
              </Badge>
              <span className="text-slate-500 text-sm font-mono">#{finding.id}</span>
            </div>
            {isEditing ? (
              <TextArea
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="text-2xl font-bold font-display text-white mt-1 bg-slate-900/50 border-cyan-500/30"
                rows={1}
              />
            ) : (
              <h1 className="text-2xl font-bold font-display text-white mt-1">{finding.title}</h1>
            )}
          </div>
        </div>
        <div className="flex gap-3 items-center">
          {/* AI Feature Hidden
          {findingId && (
            <Button variant="outline" size="sm" onClick={() => openAI({ findingId })}>
              <Sparkles className="w-4 h-4 mr-1" /> AI Analyze
            </Button>
          )}
          */}
          {isEditing ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                {t('cancel_btn')}
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveDetails}>
                {t('save_changes_btn')}
              </Button>
            </>
          ) : (
            <>
              <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                <Button variant="secondary" size="sm" onClick={handleStartEdit}>
                  <FileText className="w-4 h-4 mr-2" /> {t('edit_details')}
                </Button>
              </PermissionGate>
              {(user?.role === Role.QA || user?.role === Role.PM || user?.role === Role.SUPER_ADMIN) && finding.status === 'ready_for_testing' && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 border-emerald-400/20"
                    onClick={() => handleStatusUpdate('closed')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> {t('verify_fixed')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-rose-500/50 text-rose-400 hover:bg-rose-500/10"
                    onClick={() => handleStatusUpdate('open')}
                  >
                    {t('reopen')}
                  </Button>
                </>
              )}
              <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 border-emerald-400/20"
                  onClick={() => handleStatusUpdate('closed')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> {t('mark_closed')}
                </Button>
              </PermissionGate>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Summary Panel */}
        <div className="space-y-6">
          <GlassCard title={t('details_panel')}>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-slate-700/50 pb-2">
                <span className="text-slate-400">{t('label_status')}</span>
                <Badge variant={finding.status === 'open' ? 'danger' : finding.status === 'closed' ? 'success' : finding.status === 'blocked' ? 'danger' : 'warning'}>{finding.status.toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between border-b border-slate-700/50 pb-2">
                <span className="text-slate-400">{t('label_project')}</span>
                <span className="text-slate-200">{finding.projectName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/50 pb-2">
                <span className="text-slate-400">{t('label_client')}</span>
                <span className="text-slate-200">{finding.clientName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/50 pb-2">
                <span className="text-slate-400">{t('label_created')}</span>
                <span className="text-slate-200">{finding.created}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400">{t('label_assignee')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-900 text-cyan-400 flex items-center justify-center text-xs font-bold border border-cyan-500/30">
                    {finding.ownerName ? finding.ownerName.charAt(0) : 'U'}
                  </div>
                  <span className="text-slate-200">{finding.ownerName}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700 space-y-4">
              {(user?.role === Role.QA || user?.role === Role.PM || user?.role === Role.SUPER_ADMIN || user?.role === Role.OPS || user?.role === Role.DEV) ? (
                <>
                  <div>
                    <Label>{t('update_status')}</Label>
                    <Select
                      className="mt-1 text-sm py-1.5"
                      value={finding.status}
                      onChange={(e) => handleStatusUpdate(e.target.value)}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="ready_for_testing">Ready for Testing</option>
                      <option value="blocked">Blocked</option>
                      <option value="closed">Closed</option>
                      <option value="dismissed">Dismissed</option>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('update_severity')}</Label>
                    <Select
                      className="mt-1 text-sm py-1.5"
                      value={finding.severity}
                      onChange={(e) => handleSeverityUpdate(e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('update_assignee')}</Label>
                    <Select
                      className="mt-1 text-sm py-1.5"
                      value={finding.assignedToId || 'none'}
                      onChange={(e) => handleAssigneeUpdate(e.target.value)}
                    >
                      <option value="none">{t('unassigned')}</option>
                      {assignableUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </Select>
                  </div>
                </>
              ) : (
                <div className="pt-2">
                  <p className="text-xs text-slate-500 italic">{t('internal_only_controls')}</p>
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard title={t('related_assets')}>
            <div className="space-y-2">
              {finding.evidence?.map(file => (
                <div key={file.id} className="flex items-center justify-between p-2 rounded bg-slate-800/30 border border-slate-700/30">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {file.mimeType?.includes('image') ? <ImageIcon className="w-4 h-4 text-cyan-400" /> : <FileText className="w-4 h-4 text-slate-400" />}
                    <span className="text-xs text-slate-300 truncate" title={file.filename}>{file.filename}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleFileAction(file.id)} title="Download">
                      <Download className="w-3 h-3 text-slate-500 cursor-pointer hover:text-white" />
                    </button>
                    {isInternalRole(user?.role) && (
                      <button onClick={() => handleDeleteFile(file.id)} title="Delete">
                        <Trash2 className="w-3 h-3 text-slate-500 cursor-pointer hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(!finding.evidence || finding.evidence.length === 0) && (
                <p className="text-xs text-slate-500 text-center py-2">{t('no_evidence')}</p>
              )}

              <div className="mt-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? t('posting') : t('upload_evidence')}
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* RIGHT COLUMN: Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-700/50 gap-6">
            {['overview', 'timeline', 'comments'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 text-sm font-medium capitalize transition-all border-b-2 ${activeTab === tab
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}
              >
                {t(`${tab}_tab`)}
              </button>
            ))}
          </div>

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <GlassCard title={t('finding_description')}>
                {isEditing ? (
                  <TextArea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full bg-slate-900/50 border-cyan-500/20 text-slate-300 text-sm"
                    rows={4}
                  />
                ) : (
                  <p className="text-slate-300 leading-relaxed text-sm">
                    {finding.description}
                  </p>
                )}
              </GlassCard>

              <GlassCard title={t('finding_impact')}>
                {isEditing ? (
                  <TextArea
                    value={editForm.impact}
                    onChange={(e) => setEditForm({ ...editForm, impact: e.target.value })}
                    className="w-full bg-slate-900/50 border-cyan-500/20 text-slate-300 text-sm"
                    rows={4}
                  />
                ) : (
                  <p className="text-slate-300 leading-relaxed text-sm">
                    {finding.impact || "No impact information provided."}
                  </p>
                )}
              </GlassCard>

              <GlassCard className="border-rose-500/20 bg-rose-900/5">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-md font-semibold text-rose-100">{t('finding_remediation')}</h3>
                    {isEditing ? (
                      <TextArea
                        value={editForm.remediation}
                        onChange={(e) => setEditForm({ ...editForm, remediation: e.target.value })}
                        className="w-full mt-2 bg-slate-900/50 border-rose-500/20 text-rose-200/80 text-sm"
                        rows={4}
                      />
                    ) : (
                      <p className="text-rose-200/80 mt-1 text-sm leading-relaxed">
                        {finding.remediation || "No remediation steps provided."}
                      </p>
                    )}
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* TAB: TIMELINE */}
          {activeTab === 'timeline' && (
            <GlassCard>
              <div className="space-y-6 pl-4 border-l border-slate-700/50 ml-2">
                {finding.timeline?.map((event, idx) => (
                  <div key={event.id} className="relative">
                    <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 ${idx === 0 ? 'bg-slate-900 border-slate-500' : 'bg-cyan-900 border-cyan-500'}`}></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-slate-200">{formatTimelineAction(event.action)}</p>
                        {event.detail && <p className="text-xs text-slate-400 mt-0.5">{event.detail}</p>}
                        <p className="text-xs text-slate-500 mt-1">by {event.user}</p>
                      </div>
                      <span className="text-xs text-slate-600">{new Date(event.date).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* TAB: COMMENTS */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              <GlassCard className="space-y-6">
                {comments.length === 0 && <div className="text-center text-slate-500 py-8 text-sm">{t('no_comments')}</div>}
                {comments.filter(c => !c.parentId).map(thread => (
                  <div key={thread.id} className="space-y-4">
                    {/* Root Comment */}
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-600">
                        {thread.author?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-cyan-400">{thread.author?.name}</span>
                              <Badge variant="neutral" className="py-0 px-1.5 text-[10px]">{thread.author?.role}</Badge>
                            </div>
                            <span className="text-[10px] text-slate-500">{new Date(thread.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-slate-300">{thread.content}</p>
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {comments.filter(r => r.parentId === thread.id).map(reply => (
                      <div key={reply.id} className="flex gap-4 pl-12 relative">
                        <div className="absolute left-6 top-[-20px] bottom-6 w-px bg-slate-800"></div>
                        <div className="absolute left-6 top-4 w-4 h-px bg-slate-800"></div>

                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 border border-slate-600 shrink-0 z-10">
                          {reply.author?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1">
                          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${reply.author?.role?.includes('CLIENT') ? 'text-amber-400' : 'text-slate-200'}`}>{reply.author?.name}</span>
                                {reply.author?.role?.includes('CLIENT') && <Badge variant="warning" className="py-0 px-1.5 text-[10px]">Client</Badge>}
                              </div>
                              <span className="text-[10px] text-slate-500">{new Date(reply.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-slate-300">{reply.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Quick Reply for thread */}
                    <div className="pl-12 pt-2">
                      <button
                        className="text-[10px] text-cyan-500 hover:text-cyan-400 font-bold"
                        onClick={() => {
                          const txt = prompt("Enter your reply:");
                          if (txt) handlePostReply(thread.id, txt);
                        }}
                      >
                        {t('reply_to_thread')}
                      </button>
                    </div>
                  </div>
                ))}
              </GlassCard>

              {/* Reply Box */}
              <div className="relative">
                <TextArea
                  rows={3}
                  placeholder={t('post_comment')}
                  className="w-full pr-12 resize-none"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={postingComment}
                />
                <button
                  onClick={() => handlePostReply()}
                  disabled={postingComment || !replyText.trim()}
                  className="absolute right-3 bottom-3 p-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className={`w-4 h-4 ${postingComment ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
