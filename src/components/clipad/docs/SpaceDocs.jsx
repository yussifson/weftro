import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { supabase } from '@/api/supabaseClient';
import { Loader2, Plus, FileText, Sparkles, Save, AlignLeft, Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, Code, Strikethrough } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { invokeCloudflareAi } from '@/lib/cloudflareAI';

export default function SpaceDocs({ spaceId }) {
  const [docs, setDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const selectedDoc = docs.find((d) => d.id === selectedDocId);

  const loadDocs = useCallback(async () => {
    if (!spaceId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('clipad_docs')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      toast({ title: 'Error loading docs', description: error.message, variant: 'destructive' });
    } else {
      setDocs(data || []);
      if (data?.length > 0 && !selectedDocId) {
        setSelectedDocId(data[0].id);
      }
    }
    setIsLoading(false);
  }, [spaceId, selectedDocId, toast]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const handleCreateDoc = async () => {
    const newDoc = {
      space_id: spaceId,
      title: 'Untitled Document',
      content: '<p>Start typing...</p>',
    };
    
    const { data, error } = await supabase.from('clipad_docs').insert(newDoc).select().single();
    if (error) {
      toast({ title: 'Error creating doc', description: error.message, variant: 'destructive' });
      return;
    }
    
    setDocs([data, ...docs]);
    setSelectedDocId(data.id);
  };

  const handleSaveDoc = async (docId, title, content) => {
    setIsSaving(true);
    const { error } = await supabase
      .from('clipad_docs')
      .update({ title, content })
      .eq('id', docId);

    if (error) {
      toast({ title: 'Error saving doc', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Document saved successfully.' });
      setDocs(docs.map((d) => (d.id === docId ? { ...d, title, content } : d)));
    }
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-200px)] md:h-[600px] md:border rounded-2xl bg-card overflow-hidden md:shadow-sm">
      {/* Sidebar */}
      <div className={`${selectedDoc ? 'hidden md:flex' : 'flex'} w-full md:w-64 border-b md:border-b-0 md:border-r bg-muted/20 flex-col shrink-0`}>
        <div className="p-4 border-b flex justify-between items-center bg-card">
          <h3 className="font-semibold text-sm">Documents</h3>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCreateDoc}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading && !docs.length ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : docs.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center p-4 flex flex-col items-center gap-2">
              <FileText className="w-6 h-6 opacity-20" />
              <p>No documents yet.</p>
            </div>
          ) : (
            docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                  selectedDocId === doc.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0 opacity-70" />
                <span className="truncate">{doc.title || 'Untitled'}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={`${selectedDoc ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-background min-h-0`}>
        {selectedDoc ? (
          <DocEditor 
            doc={selectedDoc} 
            onSave={(title, content) => handleSaveDoc(selectedDoc.id, title, content)}
            isSaving={isSaving}
            onBack={() => setSelectedDocId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4 bg-card/50">
            <FileText className="w-12 h-12 opacity-10" />
            <p>Select or create a document</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DocEditor({ doc, onSave, isSaving, onBack }) {
  const [title, setTitle] = useState(doc.title);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setTitle(doc.title);
  }, [doc.id]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: doc.content,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base max-w-none focus:outline-none min-h-[400px]',
      },
    },
  }, [doc.id]); // Reload when doc changes

  const handleAiAction = async (action) => {
    if (!editor) return;
    
    // Get selected text or full text
    const { from, to } = editor.state.selection;
    const textToProcess = from !== to 
      ? editor.state.doc.textBetween(from, to, ' ') 
      : editor.getText();

    if (!textToProcess || textToProcess.trim().length === 0) {
      toast({ title: 'No text found', description: 'Please add or select some text first.' });
      return;
    }

    setIsAiLoading(true);
    try {
      let prompt = '';
      if (action === 'improve') {
        prompt = `Improve the following text, making it more professional and clearer. Only output the improved text.\n\n${textToProcess}`;
      } else if (action === 'summarize') {
        prompt = `Summarize the following text concisely. Only output the summary.\n\n${textToProcess}`;
      }

      const response = await invokeCloudflareAi(prompt, "You are a helpful AI writing assistant. Provide only the requested text without quotes or explanations.");
      
      // If text was selected, replace it. Otherwise append.
      if (from !== to) {
        editor.chain().focus().deleteSelection().insertContent(response).run();
      } else {
        editor.chain().focus().insertContent(`\n\n**AI ${action === 'improve' ? 'Improvement' : 'Summary'}:**\n${response}`).run();
      }
      toast({ title: 'AI Assistant', description: 'Text processed successfully.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'AI Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
            {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4 p-2 sm:p-4 border-b bg-card min-h-[60px]">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden shrink-0 w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onBack}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700 dark:text-slate-300"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            </Button>
          )}
          <input
            value={title || ''}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg md:text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 flex-1 placeholder:text-muted-foreground/30 min-w-[100px] text-slate-900 dark:text-white"
            placeholder="Untitled Document"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex bg-muted/40 rounded-md overflow-hidden border shadow-sm shrink-0">
            <Button size="sm" variant="ghost" className="gap-2 rounded-none hover:bg-primary/10 hover:text-primary h-8 px-2 sm:px-3" onClick={() => handleAiAction('improve')} disabled={isAiLoading}>
              {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
              <span className="text-xs font-medium hidden sm:inline">Improve</span>
            </Button>
            <div className="w-px bg-border" />
            <Button size="sm" variant="ghost" className="gap-2 rounded-none hover:bg-primary/10 hover:text-primary h-8 px-2 sm:px-3" onClick={() => handleAiAction('summarize')} disabled={isAiLoading}>
              <AlignLeft className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium hidden sm:inline">Summarize</span>
            </Button>
          </div>
          <Button size="sm" onClick={() => onSave(title, editor.getHTML())} disabled={isSaving} className="shadow-sm h-8 shrink-0 bg-[#006065] dark:bg-[#131A2C] hover:bg-[#004e52] text-white">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <Save className="w-4 h-4 sm:mr-2" />}
            <span className="hidden sm:inline">Save Document</span>
          </Button>
        </div>
      </div>
      {/* Formatting Bar */}
      <div className="px-2 md:px-4 py-2 border-b bg-slate-50 dark:bg-card/50 flex gap-1 sm:gap-1.5 flex-nowrap overflow-x-auto no-scrollbar items-center mask-edges">
        <Button size="icon" variant={editor.isActive('bold') ? 'secondary' : 'ghost'} className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg shrink-0" onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold className="w-4 h-4 sm:w-4 sm:h-4" />
        </Button>
        <Button size="icon" variant={editor.isActive('italic') ? 'secondary' : 'ghost'} className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg shrink-0" onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic className="w-4 h-4 sm:w-4 sm:h-4" />
        </Button>
        <Button size="icon" variant={editor.isActive('strike') ? 'secondary' : 'ghost'} className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg shrink-0" onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <Strikethrough className="w-4 h-4 sm:w-4 sm:h-4" />
        </Button>
        <div className="w-px h-6 sm:h-5 bg-border mx-1 sm:mx-1.5 shrink-0" />
        <Button size="icon" variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'} className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg shrink-0" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
          <Heading1 className="w-4 h-4 sm:w-4 sm:h-4" />
        </Button>
        <Button size="icon" variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'} className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg shrink-0" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
          <Heading2 className="w-4 h-4 sm:w-4 sm:h-4" />
        </Button>
        <div className="w-px h-6 sm:h-5 bg-border mx-1 sm:mx-1.5 shrink-0" />
        <Button size="icon" variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg shrink-0" onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
          <List className="w-4 h-4 sm:w-4 sm:h-4" />
        </Button>
        <Button size="icon" variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg shrink-0" onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
          <ListOrdered className="w-4 h-4 sm:w-4 sm:h-4" />
        </Button>
        <div className="w-px h-6 sm:h-5 bg-border mx-1 sm:mx-1.5 shrink-0" />
        <Button size="icon" variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'} className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg shrink-0" onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
          <Quote className="w-4 h-4 sm:w-4 sm:h-4" />
        </Button>
        <Button size="icon" variant={editor.isActive('codeBlock') ? 'secondary' : 'ghost'} className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg shrink-0" onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">
          <Code className="w-4 h-4 sm:w-4 sm:h-4" />
        </Button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-[#0B1121]">
        <EditorContent editor={editor} className="max-w-3xl mx-auto min-h-[500px]" />
      </div>
    </div>
  );
}

