'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  listTags, createTag, updateTag, deleteTag,
  listExecutivesWithTags, assignTag, unassignTag, listExecutives
} from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Loader2, MapPin, UserCheck, Trash2, X, Check } from 'lucide-react';

export default function TagsManagementPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
  const [execsWithTags, setExecsWithTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MANAGER' | 'LOCATION'>('MANAGER');
  const [form, setForm] = useState({ name: '', description: '', tag_type: 'MANAGER' });
  const [submitting, setSubmitting] = useState(false);
  const [assignModal, setAssignModal] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [t, e, et] = await Promise.all([listTags(), listExecutives(), listExecutivesWithTags()]);
      setTags(t?.items || t || []);
      setExecutives(e?.items || e?.executives || e || []);
      setExecsWithTags(et?.items || et || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filteredTags = tags.filter((t: any) => t.tag_type === activeTab);

  const handleCreate = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTag({ ...form, tag_type: activeTab });
      toast.success(`${activeTab === 'MANAGER' ? 'Manager' : 'Location'} tag created`);
      setForm({ name: '', description: '', tag_type: activeTab });
      load();
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed to create tag'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteTag(id); toast.success('Tag deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleAssign = async (execId: string, tagId: string) => {
    try { await assignTag(execId, tagId); toast.success('Tag assigned'); load(); setAssignModal(null); }
    catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed to assign'); }
  };

  const handleUnassign = async (execId: string, tagId: string) => {
    try { await unassignTag(execId, tagId); toast.success('Tag removed'); load(); }
    catch { toast.error('Failed to remove'); }
  };

  const getExecTags = (execId: string) => {
    const exec = execsWithTags.find((e: any) => e.executive_id === execId || e.id === execId);
    return exec?.manager_tags || exec?.location_tags || exec?.tags || [];
  };

  return (
    <div className="space-y-6">
      {/* Header row with title + inline create form */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tags Management</h1>
          <p className="text-sm text-slate-500 mt-1">Create and assign Manager/Location tags to executives</p>
        </div>
        <form onSubmit={handleCreate} className="flex items-end gap-2 flex-wrap">
          <div>
            <Label className="text-xs text-slate-500">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1 h-9 w-44" placeholder={activeTab === 'MANAGER' ? 'e.g. Rajesh Kumar' : 'e.g. Nagpur Office'} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 h-9 w-40" placeholder="Optional" />
          </div>
          <Button type="submit" disabled={submitting} size="sm" className="h-9 bg-indigo-600 hover:bg-indigo-700">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Create {activeTab === 'MANAGER' ? 'Manager' : 'Location'}
          </Button>
        </form>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'MANAGER' ? 'default' : 'outline'}
          onClick={() => setActiveTab('MANAGER')}
          className={activeTab === 'MANAGER' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
        >
          <UserCheck className="h-4 w-4 mr-2" /> Manager Tags
        </Button>
        <Button
          variant={activeTab === 'LOCATION' ? 'default' : 'outline'}
          onClick={() => setActiveTab('LOCATION')}
          className={activeTab === 'LOCATION' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
        >
          <MapPin className="h-4 w-4 mr-2" /> Location Tags
        </Button>
      </div>

      {/* Tags List - full width */}
      <div className="space-y-3">
        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {filteredTags.map((tag: any) => (
            <Card key={tag.id} className="rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${activeTab === 'MANAGER' ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {activeTab === 'MANAGER' ? <UserCheck className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{tag.name}</div>
                    {tag.description && <div className="text-xs text-slate-500">{tag.description}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAssignModal(tag)}>
                    <Plus className="h-3 w-3 mr-1" /> Assign
                  </Button>
                  <Button size="sm" variant="ghost" className="text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDelete(tag.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Show assigned executives */}
              <div className="mt-3 flex flex-wrap gap-2">
                {execsWithTags.filter((e: any) => {
                  const eTags = [...(e.manager_tags || []), ...(e.location_tags || []), ...(e.tags || [])];
                  return eTags.some((t: any) => t.tag_id === tag.id || t.id === tag.id);
                }).map((e: any) => (
                  <span key={e.executive_id || e.id} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-full text-xs text-slate-700">
                    {e.executive_name || e.full_name || e.name}
                    <button onClick={() => handleUnassign(e.executive_id || e.id, tag.id)} className="hover:text-rose-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </Card>
          ))}
          {!loading && filteredTags.length === 0 && (
            <Card className="rounded-xl p-10 text-center text-sm text-slate-500">
              No {activeTab === 'MANAGER' ? 'manager' : 'location'} tags yet. Create one above.
            </Card>
          )}
        </div>

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setAssignModal(null)}>
          <Card className="w-full max-w-md rounded-xl p-6 m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Assign &quot;{assignModal.name}&quot; to Executive</h3>
              <Button variant="ghost" size="sm" onClick={() => setAssignModal(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {executives.map((exec: any) => {
                const alreadyAssigned = execsWithTags.some((e: any) => {
                  const eid = e.executive_id || e.id;
                  if (eid !== exec.id) return false;
                  const eTags = [...(e.manager_tags || []), ...(e.location_tags || []), ...(e.tags || [])];
                  return eTags.some((t: any) => t.tag_id === assignModal.id || t.id === assignModal.id);
                });
                return (
                  <div key={exec.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                    <div>
                      <div className="font-medium text-sm text-slate-900">{exec.full_name || exec.name}</div>
                      <div className="text-xs text-slate-500">{exec.email}</div>
                    </div>
                    {alreadyAssigned ? (
                      <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" /> Assigned</span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleAssign(exec.id, assignModal.id)}>Assign</Button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
