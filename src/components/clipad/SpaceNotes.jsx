import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { supabase } from '@/api/supabaseClient';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import RecommendationPanel from '@/components/clipad/features/RecommendationPanel';

export default function SpaceNotes({ spaceId, workspaceId }) {
  const [isSaving, setIsSaving] = useState(false);
  const [initialContent, setInitialContent] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [editorText, setEditorText] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    async function loadNotes() {
      if (!spaceId) return;
      const { data, error } = await supabase.from('clipad_spaces').select('shared_notes, company_id').eq('id', spaceId).single();
      if (!error && data) {
        setInitialContent(data.shared_notes || '<p>Welcome to your space notes...</p>');
      }
      setIsLoaded(true);
    }
    loadNotes();
  }, [spaceId]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    onUpdate: ({ editor }) => {
      setEditorText(editor.getText());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base focus:outline-none max-w-none min-h-[300px]',
      },
    },
  }, [isLoaded]);

  const handleSave = async () => {
    if (!editor || !spaceId) return;
    setIsSaving(true);
    try {
      const html = editor.getHTML();
      const { error } = await supabase.from('clipad_spaces').update({ shared_notes: html }).eq('id', spaceId);
      if (error) throw error;
      toast({ title: 'Notes Saved', description: 'Your space notes have been updated.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error Saving Notes', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const insertRecommendation = (snippet) => {
    if (editor) {
      editor.commands.insertContent(`\n<blockquote>${snippet}</blockquote>\n`);
    }
  };

  if (!isLoaded || !editor) {
    return <div className="h-[400px] flex items-center justify-center bg-card rounded-2xl border"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="bg-card border rounded-2xl shadow-sm flex flex-col overflow-hidden relative">
      <RecommendationPanel contextText={editorText} workspaceId={workspaceId} onInsert={insertRecommendation} />
      {/* Editor Toolbar */}
      <div className="border-b bg-muted/20 p-2 flex gap-2 flex-wrap items-center">
        <Button size="sm" variant={editor.isActive('bold') ? 'default' : 'ghost'} onClick={() => editor.chain().focus().toggleBold().run()}>Bold</Button>
        <Button size="sm" variant={editor.isActive('italic') ? 'default' : 'ghost'} onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</Button>
        <Button size="sm" variant={editor.isActive('strike') ? 'default' : 'ghost'} onClick={() => editor.chain().focus().toggleStrike().run()}>Strike</Button>
        <div className="w-px h-6 bg-border mx-2" />
        <Button size="sm" variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</Button>
        <Button size="sm" variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Button>
        <Button size="sm" variant={editor.isActive('bulletList') ? 'default' : 'ghost'} onClick={() => editor.chain().focus().toggleBulletList().run()}>Bullet List</Button>
        <div className="flex-1" />
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </Button>
      </div>
      
      {/* Editor Content Area */}
      <div className="p-4 md:p-6 overflow-y-auto max-h-[600px] bg-white dark:bg-[#0B1121]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
